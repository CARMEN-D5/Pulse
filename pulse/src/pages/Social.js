import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "../components/Icon";
import { Alert, PrimaryButton, Screen, ScreenHeader } from "../components/ui";
import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  subscribeToFriendships,
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests,
  unfriend,
} from "../firestore/friendship";
import {
  getOrCreateConversation,
  markConversationRead,
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
} from "../firestore/messaging";
import { logAction } from "../firestore/scoring";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getMyTodayPost,
  subscribeToComments,
  subscribeToFeed,
  subscribeToLikes,
  toggleLike,
} from "../firestore/social";
import { searchUserByEmail } from "../firestore/users";
import { deletePostImage, pickImage, uploadPostImage } from "../storage/uploads";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import { confirm } from "../utils/dialogs";

/**
 * Social — feed of daily posts, your own daily post composer, and DMs.
 *
 * Layout:
 *   Tabs: Feed | Today | Messages
 *   - Feed     : every user's post for the day, with likes + comments
 *   - Today    : compose / edit / view your own post for today
 *   - Messages : list of conversations + ability to start a new one,
 *                opens a thread overlay
 */
function Social({ user, onBack, onActivityLogged }) {
  const [tab, setTab] = useState("feed");

  // The open conversation (id + other-user metadata). Null = no overlay.
  const [openThread, setOpenThread] = useState(null);
  // Top-level error banner — used when an action fails so the user isn't
  // left wondering why nothing happened.
  const [socialError, setSocialError] = useState("");

  // -----------------------------------------------------------------------
  // Friendship + conversations layer — shared by FeedTab (post visibility
  // filter), MessagesTab (friends list + request inbox), and the tab
  // badges. Subscribing once here keeps everything in lock-step and avoids
  // duplicate listeners.
  // -----------------------------------------------------------------------
  const [friendships, setFriendships] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubF = subscribeToFriendships(user.uid, setFriendships);
    const unsubIn = subscribeToIncomingRequests(user.uid, setIncomingRequests);
    const unsubOut = subscribeToOutgoingRequests(user.uid, setOutgoingRequests);
    const unsubConv = subscribeToConversations(user.uid, setConversations);
    return () => {
      unsubF();
      unsubIn();
      unsubOut();
      unsubConv();
    };
  }, [user?.uid]);

  // A conversation is "unread" for me if the last message landed AFTER my
  // last read marker AND I'm not the one who sent it. The check is purely
  // derived state from the live conversations subscription.
  const isUnread = (conv) => {
    if (!conv || !user?.uid) return false;
    if (conv.lastMessageSender === user.uid) return false;
    if (!conv.lastMessageAt) return false;
    const lastReadMs = conv.lastReadAt?.[user.uid]?.toMillis?.() ?? 0;
    const lastMsgMs = conv.lastMessageAt?.toMillis?.() ?? 0;
    return lastMsgMs > lastReadMs;
  };

  const unreadConvCount = useMemo(
    () => conversations.filter(isUnread).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, user?.uid]
  );

  // Fast-lookup set of friend uids — derived from the friendships list.
  const friendUids = useMemo(() => {
    const out = new Set();
    for (const f of friendships) {
      for (const p of f.participants || []) {
        if (p && p !== user?.uid) out.add(p);
      }
    }
    return out;
  }, [friendships, user?.uid]);

  // Feed query uses [self, ...friends] as the author whitelist. Posts are
  // friends-only at the Firestore rule level, so an unfiltered feed query
  // would be rejected with permission-denied; this list keeps the query
  // safe and minimal.
  const visibleAuthorUids = useMemo(() => {
    if (!user?.uid) return [];
    return [user.uid, ...Array.from(friendUids)];
  }, [user?.uid, friendUids]);

  const openThreadAndMarkRead = (thread) => {
    setOpenThread(thread);
    // Best-effort — failure shouldn't block opening the thread.
    if (thread?.convId && user?.uid) {
      markConversationRead(thread.convId, user.uid);
    }
  };

  const startConversation = async (otherUser) => {
    setSocialError("");
    // Mirror the Firestore rule client-side so the error is friendly —
    // creating a conversation will be denied unless we're already friends.
    if (!friendUids.has(otherUser.uid)) {
      setSocialError("You can only message friends.");
      return;
    }
    const res = await getOrCreateConversation(
      { uid: user.uid, name: displayNameFor(user), email: user.email },
      otherUser
    );
    if (res.ok) {
      openThreadAndMarkRead({
        convId: res.data.id,
        otherUid: otherUser.uid,
        otherName: otherUser.displayName || otherUser.name || otherUser.email,
      });
    } else {
      setSocialError(res.error || "Couldn't open that conversation.");
    }
  };

  // Tab badge combines pending friend requests + unread DMs so users see
  // a single number for "stuff to look at".
  const messagesBadge = incomingRequests.length + unreadConvCount;

  return (
    <Screen contentContainerStyle={styles.screen} gradient={false} safeArea={false}>
      {/* Inside the tab bar there is nowhere to go "back" to, so the mockup
          shows a plain centred page title; the back arrow only appears when a
          caller pushes Social as a stacked screen. */}
      {onBack ? (
        <ScreenHeader title="Social" onBack={onBack} />
      ) : (
        <Text style={styles.pageTitle} accessibilityRole="header">
          Social
        </Text>
      )}

      {socialError ? (
        <Pressable onPress={() => setSocialError("")} accessibilityRole="button">
          <Alert message={socialError} />
        </Pressable>
      ) : null}

      <View style={styles.tabs} accessibilityRole="tablist">
        {[
          { id: "feed", label: "Feed" },
          { id: "today", label: "Today" },
          {
            id: "messages",
            label: messagesBadge > 0 ? `Messages (${messagesBadge})` : "Messages",
          },
        ].map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
            style={({ pressed }) => [
              styles.tab,
              tab === t.id && styles.tabActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "feed" && (
        <FeedTab
          user={user}
          visibleAuthorUids={visibleAuthorUids}
          friendUids={friendUids}
          onStartConversation={startConversation}
        />
      )}
      {tab === "today" && <TodayTab user={user} onActivityLogged={onActivityLogged} />}
      {tab === "messages" && (
        <MessagesTab
          user={user}
          friendships={friendships}
          friendUids={friendUids}
          incomingRequests={incomingRequests}
          outgoingRequests={outgoingRequests}
          conversations={conversations}
          isUnread={isUnread}
          onOpenThread={openThreadAndMarkRead}
          onStartConversation={startConversation}
          onError={setSocialError}
        />
      )}

      <ThreadOverlay
        user={user}
        thread={openThread}
        onClose={() => setOpenThread(null)}
      />
    </Screen>
  );
}

// ============================================================================
// Helpers
// ============================================================================

// Exported so App can stamp the same author name onto share-prompt posts.
export function displayNameFor(u) {
  return (
    u?.displayName || u?.name || (u?.email ? u.email.split("@")[0] : null) || "Someone"
  );
}

function initialsFor(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** Round avatar with initials — used by posts, comments and conversations. */
function Avatar({ name, size = 40, showDot = false }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initialsFor(name)}</Text>
      {showDot ? <View style={styles.unreadDot} /> : null}
    </View>
  );
}

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/** Compact pill button used throughout the messages tab. */
function SmallButton({ label, onPress, tone = "primary" }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.smallBtn,
        tone === "primary" ? styles.smallBtnPrimary : styles.smallBtnGhost,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.smallBtnText, tone === "primary" && styles.smallBtnTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ============================================================================
// Feed tab
// ============================================================================

function FeedTab({ user, visibleAuthorUids, friendUids, onStartConversation }) {
  const [posts, setPosts] = useState([]);
  const [feedError, setFeedError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live feed subscription, scoped to [self, ...friends]. Re-subscribes
  // whenever the friend list changes (a new accepted request, an unfriend).
  // We serialise the uids to a string for the dep array so React only
  // re-runs the effect when the set actually changes.
  const authorsKey = visibleAuthorUids.join("|");
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToFeed(visibleAuthorUids, ({ posts: incoming, error }) => {
      setPosts(incoming);
      setFeedError(error);
      setLoading(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorsKey]);

  if (feedError) {
    // Most common cases at this point:
    //   "failed-precondition" → composite index missing. Firestore puts
    //   a clickable URL in the message that auto-creates the index.
    //   "permission-denied"   → Firestore rule blocked the query.
    const isIndex = feedError.code === "failed-precondition";
    const isPerms = feedError.code === "permission-denied";
    const urlMatch = feedError.message?.match(/https?:\/\/\S+/);
    return (
      <View style={[styles.card, styles.errorCard]} accessibilityRole="alert">
        <Text style={styles.errorTitle}>Couldn't load the feed.</Text>
        <Text style={styles.errorBody}>
          <Text style={styles.code}>{feedError.code || "unknown"}</Text>
          {isIndex &&
            " — Firestore needs a composite index on the posts collection. Tap the link below to auto-create it (takes ~60 seconds)."}
          {isPerms &&
            " — Firestore rules are blocking the read. Re-publish the rules in the Firebase Console."}
        </Text>
        {urlMatch ? (
          <Pressable
            onPress={() => Linking.openURL(urlMatch[0])}
            accessibilityRole="link"
          >
            <Text style={styles.errorLink}>{urlMatch[0]}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.errorMeta}>Full message: {feedError.message}</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>Loading feed…</Text>
      </View>
    );
  }
  if (friendUids.size === 0 && posts.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>
          Add friends from the Messages tab to start seeing posts from people you know. Your
          own posts will show up here once you check in.
        </Text>
      </View>
    );
  }
  if (posts.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>
          Nothing here yet — be the first to share a moment from your day.
        </Text>
      </View>
    );
  }
  return (
    <>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} user={user} onStartConversation={onStartConversation} />
      ))}
    </>
  );
}

// ============================================================================
// PostCard — two-slide post, likes, comments
// ============================================================================

function PostCard({ post, user, onStartConversation, onDeleted }) {
  const [slide, setSlide] = useState(post.imageUrl ? 0 : 1);
  const [likeSummary, setLikeSummary] = useState({ count: 0, likedByMe: false });
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isMine = post.authorUid === user?.uid;

  // Live subscriptions — likes and comments update without a refresh.
  // Both are scoped to this post, so leaving the page (component unmount)
  // unsubscribes via the returned cleanup function.
  useEffect(() => {
    const unsubLikes = subscribeToLikes(post.id, user?.uid, setLikeSummary);
    const unsubComments = subscribeToComments(post.id, setComments);
    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [post.id, user?.uid]);

  // Comment count is just `comments.length` now that they're always loaded.
  const commentCount = comments.length;

  const onToggleLike = async () => {
    // No optimistic update — the snapshot listener fires within ~100ms of
    // the write completing, which is plenty snappy and avoids the brief
    // flicker that an optimistic-then-snapshot-overwrite pattern can cause.
    await toggleLike(post.id, user.uid);
  };

  const onSubmitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    const res = await addComment(post.id, {
      authorUid: user.uid,
      authorName: displayNameFor(user),
      text,
    });
    setSubmitting(false);
    if (res.ok) {
      setCommentText("");
      // No manual re-fetch — the subscription will pick up the new comment.
    }
  };

  const onDeleteComment = async (commentId) => {
    await deleteComment(post.id, commentId);
    // Subscription handles the UI update.
  };

  const onDeletePost = async () => {
    const ok = await confirm("This post will be removed permanently.", {
      title: "Delete this post?",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    // Best-effort image cleanup, then doc. The feed subscription drops it
    // from the list automatically; the Today tab uses onDeleted to swap
    // back to the compose form.
    if (post.imagePath) await deletePostImage(post.imagePath);
    await deletePost(post.id);
    if (onDeleted) onDeleted();
  };

  const onMessageAuthor = () => {
    if (!onStartConversation) return;
    onStartConversation({
      uid: post.authorUid,
      name: post.authorName,
      email: null,
      displayName: post.authorName,
    });
  };

  const hasImage = Boolean(post.imageUrl);
  const slidesCount = hasImage ? 2 : 1;

  return (
    <View style={[styles.card, shadow("sm")]}>
      {/* Author */}
      <View style={styles.postAuthor}>
        <Avatar name={post.authorName} />
        <View style={styles.flex}>
          <Text style={styles.postName}>{post.authorName}</Text>
          <Text style={styles.postWhen}>{timeAgo(post.createdAt)}</Text>
        </View>
        {!isMine ? <SmallButton label="💬 Message" onPress={onMessageAuthor} tone="ghost" /> : null}
      </View>

      {/* Slides */}
      <View style={styles.postSlides}>
        {hasImage && slide === 0 ? (
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
            accessibilityLabel="Post image"
          />
        ) : null}
        {slide === 1 || !hasImage ? (
          <View style={styles.reflection}>
            <Text style={styles.reflectionLabel}>What I did to improve</Text>
            <Text style={styles.reflectionText}>{post.reflection}</Text>
          </View>
        ) : null}
      </View>

      {slidesCount > 1 ? (
        <View style={styles.slideNav}>
          {[0, 1].map((i) => (
            <Pressable
              key={i}
              onPress={() => setSlide(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Show slide ${i + 1}`}
              accessibilityState={{ selected: slide === i }}
              style={[styles.slideDot, slide === i && styles.slideDotActive]}
            />
          ))}
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.postActions}>
        <Pressable
          onPress={onToggleLike}
          accessibilityRole="button"
          accessibilityLabel={likeSummary.likedByMe ? "Unlike" : "Like"}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <Text style={[styles.actionText, likeSummary.likedByMe && styles.actionTextLiked]}>
            {likeSummary.likedByMe ? "♥" : "♡"} {likeSummary.count}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowComments((s) => !s)}
          accessibilityRole="button"
          accessibilityLabel="Show comments"
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>💬 {commentCount}</Text>
        </Pressable>

        {isMine ? (
          <Pressable
            onPress={onDeletePost}
            accessibilityRole="button"
            accessibilityLabel="Delete post"
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Comments */}
      {showComments ? (
        <View style={styles.comments}>
          {comments.length === 0 ? (
            <Text style={styles.empty}>No comments yet — start the conversation.</Text>
          ) : (
            comments.map((c) => (
              <View style={styles.comment} key={c.id}>
                <Avatar name={c.authorName} size={28} />
                <View style={styles.flex}>
                  <Text style={styles.commentLine}>
                    <Text style={styles.commentAuthor}>{c.authorName} </Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </Text>
                  <View style={styles.commentMetaRow}>
                    <Text style={styles.commentMeta}>{timeAgo(c.createdAt)}</Text>
                    {c.authorUid === user.uid ? (
                      <>
                        <Text style={styles.commentMeta}>·</Text>
                        <Pressable
                          onPress={() => onDeleteComment(c.id)}
                          hitSlop={6}
                          accessibilityRole="button"
                        >
                          <Text style={styles.commentMeta}>delete</Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          )}

          <View style={styles.commentForm}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={onSubmitComment}
            />
            <SmallButton label={submitting ? "…" : "Post"} onPress={onSubmitComment} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ============================================================================
// Today tab — compose or view your own post for today
// ============================================================================

function TodayTab({ user, onActivityLogged }) {
  const [myPost, setMyPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // On the web this held a DOM File plus an object-URL preview. In React
  // Native the picker returns an asset whose `uri` doubles as the preview
  // source, so one piece of state covers both.
  const [imageAsset, setImageAsset] = useState(null);
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    const res = await getMyTodayPost(user.uid);
    if (res.ok) setMyPost(res.data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  const onPickImage = async () => {
    setError("");
    const res = await pickImage();
    if (res.ok) setImageAsset(res.asset);
    else if (!res.canceled && res.error) setError(res.error);
  };

  const onSubmit = async () => {
    setError("");
    if (!reflection.trim()) {
      setError("Tell us what you did to improve today.");
      return;
    }

    setSubmitting(true);
    let uploaded = null;
    if (imageAsset) {
      const up = await uploadPostImage(user.uid, imageAsset);
      if (!up.ok) {
        setError(up.error || "Image upload failed.");
        setSubmitting(false);
        return;
      }
      uploaded = up;
    }

    const res = await createPost({
      authorUid: user.uid,
      authorName: displayNameFor(user),
      imageUrl: uploaded?.url || null,
      imagePath: uploaded?.path || null,
      reflection,
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || "Couldn't save your post.");
      return;
    }

    // Score: posting counts as a meaningful connection for relationships
    logAction(user.uid, "relationships", "connection");
    if (onActivityLogged) onActivityLogged();

    setImageAsset(null);
    setReflection("");
    refresh();
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>Loading…</Text>
      </View>
    );
  }

  if (myPost) {
    // Already posted today — show their post inline.
    return (
      <>
        <View style={[styles.card, shadow("sm")]}>
          <Text style={styles.composerTitle}>You've checked in today ✨</Text>
          <Text style={styles.composerHint}>Come back tomorrow to share another moment.</Text>
        </View>
        <PostCard post={myPost} user={user} onDeleted={refresh} />
      </>
    );
  }

  return (
    <View style={[styles.card, shadow("sm")]}>
      <Text style={styles.composerTitle}>Today's check-in</Text>
      <Text style={styles.composerHint}>
        Share one thing you did to improve today — a photo and a short note.
      </Text>

      <Alert message={error} />

      <Pressable
        onPress={onPickImage}
        accessibilityRole="button"
        accessibilityLabel="Add a photo"
        style={({ pressed }) => [styles.imagePicker, pressed && styles.pressed]}
      >
        {imageAsset ? (
          <>
            <Image
              source={{ uri: imageAsset.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <Text style={styles.imagePickerMeta}>Tap to choose a different image</Text>
          </>
        ) : (
          <>
            <Text style={styles.imagePickerIcon}>📷</Text>
            <Text style={styles.imagePickerLabel}>Add a photo (optional)</Text>
            <Text style={styles.imagePickerMeta}>JPG / PNG, up to 5 MB</Text>
          </>
        )}
      </Pressable>

      <TextInput
        style={[styles.input, styles.reflectionInput]}
        placeholder="What did you do to improve today?"
        placeholderTextColor={colors.textMuted}
        value={reflection}
        onChangeText={setReflection}
        multiline
        textAlignVertical="top"
      />

      <PrimaryButton
        label={submitting ? "Posting…" : "Share today's check-in"}
        onPress={onSubmit}
        loading={submitting}
      />
    </View>
  );
}

// ============================================================================
// Messages tab — conversation list + new-conversation search
// ============================================================================

function MessagesTab({
  user,
  friendships,
  friendUids,
  incomingRequests,
  outgoingRequests,
  conversations,
  isUnread,
  onOpenThread,
  onStartConversation,
  onError,
}) {
  const [searchEmail, setSearchEmail] = useState("");
  const [searchState, setSearchState] = useState({ status: "idle" });

  // Index conversations by the other participant's uid so each friend
  // row can look up its own preview in O(1).
  const convByOther = useMemo(() => {
    const out = {};
    for (const c of conversations) {
      const otherUid = (c.participants || []).find((p) => p !== user?.uid);
      if (otherUid) out[otherUid] = c;
    }
    return out;
  }, [conversations, user?.uid]);

  // Sort the friends list so friends with the most recent activity show
  // up at the top. Friends with no conversation yet sink to the bottom
  // (their `lastMessageAt` is 0). Within the no-activity group, order is
  // stable (whatever order the friendships subscription returned).
  const sortedFriendships = useMemo(() => {
    const lastMs = (f) => {
      const otherUid = (f.participants || []).find((p) => p !== user?.uid);
      return convByOther[otherUid]?.lastMessageAt?.toMillis?.() ?? 0;
    };
    return [...friendships].sort((a, b) => lastMs(b) - lastMs(a));
  }, [friendships, convByOther, user?.uid]);

  // ---------------------------------------------------------------------
  // Relationship resolver — turns another user's uid into one of:
  //   "friend"
  //   { kind: "incoming", request }     they sent us a request
  //   { kind: "outgoing", request }     we sent them one
  //   "none"
  // ---------------------------------------------------------------------
  const relWith = (otherUid) => {
    if (!otherUid) return "none";
    if (friendUids.has(otherUid)) return "friend";
    const incoming = incomingRequests.find((r) => r.from === otherUid);
    if (incoming) return { kind: "incoming", request: incoming };
    const outgoing = outgoingRequests.find((r) => r.to === otherUid);
    if (outgoing) return { kind: "outgoing", request: outgoing };
    return "none";
  };

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------
  const onSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearchState({ status: "loading" });
    const res = await searchUserByEmail(searchEmail);
    if (!res.ok) {
      setSearchState({ status: "error", message: res.error });
      return;
    }
    if (!res.data) {
      setSearchState({ status: "not_found" });
      return;
    }
    if (res.data.uid === user.uid) {
      setSearchState({ status: "self" });
      return;
    }
    setSearchState({ status: "found", user: res.data });
  };

  const onSendRequest = async (other) => {
    const me = { uid: user.uid, name: displayNameFor(user), email: user.email };
    const them = {
      uid: other.uid,
      name: other.displayName || other.name || null,
      email: other.email || null,
    };
    const res = await sendFriendRequest(me, them);
    if (!res.ok) onError(res.error || "Couldn't send the request.");
  };

  const onAccept = async (requestId) => {
    const res = await acceptFriendRequest(requestId, { uid: user.uid });
    if (!res.ok) onError(res.error || "Couldn't accept the request.");
  };

  const onDecline = async (requestId) => {
    const res = await declineFriendRequest(requestId);
    if (!res.ok) onError(res.error || "Couldn't decline the request.");
  };

  const onUnfriend = async (otherUid, name) => {
    const ok = await confirm(`Remove ${name || "this friend"} from your friends?`, {
      title: "Remove friend?",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    const res = await unfriend(user.uid, otherUid);
    if (!res.ok) onError(res.error || "Couldn't remove friend.");
  };

  const onOpenFriendChat = (otherUid, info) => {
    const name = info?.name || info?.email || "Someone";
    onStartConversation({
      uid: otherUid,
      name,
      email: info?.email || null,
      displayName: name,
    });
  };

  return (
    <>
      {/* ------------------------------------------------------------ */}
      {/* Find a friend                                                 */}
      {/* ------------------------------------------------------------ */}
      <View style={[styles.card, shadow("sm")]}>
        <Text style={styles.composerTitle}>Add a friend</Text>
        <Text style={styles.composerHint}>
          Search for a Pulse user by email and send a friend request. Once they accept, you'll
          see each other's posts and be able to message.
        </Text>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.flex]}
            placeholder="friend@example.com"
            placeholderTextColor={colors.textMuted}
            value={searchEmail}
            onChangeText={setSearchEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={onSearch}
          />
          <SmallButton label="Find" onPress={onSearch} />
        </View>

        {searchState.status === "loading" && (
          <Text style={styles.composerHint}>Searching…</Text>
        )}
        {searchState.status === "not_found" && (
          <Text style={styles.composerHint}>No Pulse user with that email.</Text>
        )}
        {searchState.status === "self" && <Text style={styles.composerHint}>That's you 🙂</Text>}
        {searchState.status === "error" && <Alert message={searchState.message} />}
        {searchState.status === "found" && (
          <SearchResultRow
            other={searchState.user}
            rel={relWith(searchState.user.uid)}
            onAccept={onAccept}
            onDecline={onDecline}
            onSendRequest={() => onSendRequest(searchState.user)}
            onOpenChat={() => {
              onOpenFriendChat(searchState.user.uid, {
                name: searchState.user.displayName,
                email: searchState.user.email,
              });
              setSearchState({ status: "idle" });
              setSearchEmail("");
            }}
          />
        )}
      </View>

      {/* ------------------------------------------------------------ */}
      {/* Incoming friend requests                                      */}
      {/* ------------------------------------------------------------ */}
      {incomingRequests.length > 0 && (
        <View style={[styles.card, shadow("sm")]}>
          <SectionLabel>Friend requests</SectionLabel>
          <View style={styles.convList}>
            {incomingRequests.map((r) => (
              <View key={r.id} style={styles.convRow}>
                <Avatar name={r.fromName || r.fromEmail} />
                <View style={styles.flex}>
                  <Text style={styles.convName}>{r.fromName || r.fromEmail || "Someone"}</Text>
                  <Text style={styles.convLast} numberOfLines={1}>
                    {r.fromEmail}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <SmallButton label="Accept" onPress={() => onAccept(r.id)} />
                  <SmallButton label="Decline" onPress={() => onDecline(r.id)} tone="ghost" />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Outgoing pending requests                                     */}
      {/* ------------------------------------------------------------ */}
      {outgoingRequests.length > 0 && (
        <View style={[styles.card, shadow("sm")]}>
          <SectionLabel>Pending</SectionLabel>
          <View style={styles.convList}>
            {outgoingRequests.map((r) => (
              <View key={r.id} style={styles.convRow}>
                <Avatar name={r.toName || r.toEmail} />
                <View style={styles.flex}>
                  <Text style={styles.convName}>{r.toName || r.toEmail || "Someone"}</Text>
                  <Text style={styles.convLast}>Request sent ⏳</Text>
                </View>
                <SmallButton label="Cancel" onPress={() => onDecline(r.id)} tone="ghost" />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Friends list — tap a friend to open or create a DM thread     */}
      {/* ------------------------------------------------------------ */}
      <View style={[styles.card, shadow("sm")]}>
        <SectionLabel>Friends</SectionLabel>
        {sortedFriendships.length === 0 ? (
          <Text style={styles.empty}>
            No friends yet. Use the search above to send your first request.
          </Text>
        ) : (
          <View style={styles.convList}>
            {sortedFriendships.map((f) => {
              const otherUid = (f.participants || []).find((p) => p !== user.uid);
              const info = f.participantInfo?.[otherUid] || {};
              const name = info.name || info.email || "Someone";
              const conv = convByOther[otherUid];
              const unread = conv ? isUnread(conv) : false;
              return (
                <View key={f.id} style={styles.convRow}>
                  <Pressable
                    onPress={() => {
                      const c = convByOther[otherUid];
                      if (c) {
                        onOpenThread({ convId: c.id, otherUid, otherName: name });
                      } else {
                        onOpenFriendChat(otherUid, info);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Open chat with ${name}`}
                    style={({ pressed }) => [styles.friendMain, pressed && styles.pressed]}
                  >
                    <Avatar name={name} showDot={unread} />
                    <View style={styles.flex}>
                      <Text style={styles.convName}>{name}</Text>
                      <Text
                        style={[styles.convLast, unread && styles.convLastUnread]}
                        numberOfLines={1}
                      >
                        {conv?.lastMessage || "Say hi 👋"}
                      </Text>
                    </View>
                    <Text style={styles.convWhen}>
                      {conv?.lastMessageAt ? timeAgo(conv.lastMessageAt) : ""}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onUnfriend(otherUid, name)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${name} from friends`}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Icon name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </>
  );
}

/**
 * Single search-result row. Right-side action(s) change based on the
 * current relationship state with the searched user:
 *   "friend"        → "Message"
 *   "none"          → "Add friend"
 *   incoming req    → "Accept" / "Decline"
 *   outgoing req    → "Request sent" pill + "Cancel"
 */
function SearchResultRow({ other, rel, onAccept, onDecline, onSendRequest, onOpenChat }) {
  const name = other.displayName || other.email?.split("@")[0] || "Someone";
  const isObj = rel && typeof rel === "object";

  return (
    <View style={[styles.convRow, styles.searchResult]}>
      <Avatar name={name} />
      <View style={styles.flex}>
        <Text style={styles.convName}>{name}</Text>
        <Text style={styles.convLast} numberOfLines={1}>
          {other.email}
        </Text>
      </View>

      <View style={styles.requestActions}>
        {rel === "friend" && <SmallButton label="Message" onPress={onOpenChat} />}
        {rel === "none" && <SmallButton label="Add friend" onPress={onSendRequest} />}
        {isObj && rel.kind === "outgoing" && (
          <>
            <View style={styles.pillPending}>
              <Text style={styles.pillPendingText}>Request sent</Text>
            </View>
            <SmallButton label="Cancel" onPress={() => onDecline(rel.request.id)} tone="ghost" />
          </>
        )}
        {isObj && rel.kind === "incoming" && (
          <>
            <SmallButton label="Accept" onPress={() => onAccept(rel.request.id)} />
            <SmallButton
              label="Decline"
              onPress={() => onDecline(rel.request.id)}
              tone="ghost"
            />
          </>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// Thread overlay — real-time messages
// ============================================================================

function ThreadOverlay({ user, thread, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!thread?.convId) return;
    const unsub = subscribeToMessages(thread.convId, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [thread?.convId]);

  // Auto-scroll to bottom when new messages arrive, and mark the
  // conversation as read so the unread dot in the inbox stays cleared
  // even as the friend keeps typing.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
    if (thread?.convId && user?.uid && messages.length > 0) {
      markConversationRead(thread.convId, user.uid);
    }
  }, [messages.length, thread?.convId, user?.uid]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const res = await sendMessage(thread.convId, {
      senderUid: user.uid,
      text: trimmed,
    });
    setSending(false);
    if (res.ok) setText("");
  };

  return (
    <Modal
      visible={Boolean(thread)}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      {thread ? (
        <View style={[styles.threadCard, { paddingTop: insets.top }]}>
          <View style={styles.threadHeader}>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
            <Avatar name={thread.otherName} size={32} />
            <Text style={styles.threadTitle} numberOfLines={1}>
              {thread.otherName}
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.threadScroll}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <Text style={styles.empty}>No messages yet. Say hi 👋</Text>
            ) : null}

            {messages.map((m) => {
              const mine = m.senderUid === user.uid;
              const hasImage = Boolean(m.imageUrl);
              const hasText = Boolean(m.text);
              return (
                <View
                  key={m.id}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                >
                  {hasImage ? (
                    <Image
                      source={{ uri: m.imageUrl }}
                      style={styles.bubbleImage}
                      resizeMode="cover"
                      accessibilityIgnoresInvertColors
                    />
                  ) : null}
                  {hasText ? (
                    <Text
                      style={[
                        styles.bubbleText,
                        mine && styles.bubbleTextMine,
                        hasImage && styles.bubbleTextWithImage,
                      ]}
                    >
                      {m.text}
                    </Text>
                  ) : null}
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                    {timeAgo(m.createdAt)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.threadCompose, { paddingBottom: insets.bottom + spacing.md }]}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Message…"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              returnKeyType="send"
              onSubmitEditing={onSend}
            />
            <SmallButton label={sending ? "…" : "Send"} onPress={onSend} />
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, paddingBottom: 40 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  pageTitle: {
    ...type.h2,
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.pulsePrimary,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },

  tabs: { flexDirection: "row", gap: 6 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.pulsePrimary, borderColor: colors.pulsePrimary },
  tabText: { ...type.small, fontSize: 13, color: colors.text },
  tabTextActive: { color: "#fff", fontFamily: fonts.semibold },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  empty: { ...type.small, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.sm },

  errorCard: {
    backgroundColor: "rgba(172, 52, 52, 0.06)",
    borderColor: "rgba(172, 52, 52, 0.2)",
    gap: spacing.sm,
  },
  errorTitle: { ...type.label, color: colors.blError },
  errorBody: { ...type.small, fontSize: 13, color: colors.text },
  code: { fontFamily: "monospace" },
  errorLink: { ...type.caption, fontSize: 12, color: colors.pulsePrimaryDark },
  errorMeta: { ...type.caption, fontSize: 12, color: colors.textMuted },

  avatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pulseBgTint,
  },
  avatarText: { fontFamily: fonts.bold, color: colors.pulsePrimaryDark },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.pulsePrimary,
    borderWidth: 2,
    borderColor: colors.card,
  },

  postAuthor: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  postName: { ...type.label, fontSize: 14, color: colors.text },
  postWhen: { ...type.caption, fontSize: 11, color: colors.textMuted },

  postSlides: { minHeight: 120 },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.pulseBg,
  },
  reflection: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.pulseBg,
    gap: 6,
  },
  reflectionLabel: {
    ...type.caption,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  reflectionText: { ...type.body, color: colors.text },

  slideNav: { flexDirection: "row", justifyContent: "center", gap: 6 },
  slideDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  slideDotActive: { backgroundColor: colors.pulsePrimary },

  postActions: {
    flexDirection: "row",
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  actionBtn: { paddingVertical: 2 },
  actionText: { ...type.small, color: colors.textMuted },
  actionTextLiked: { color: colors.pulsePrimary },
  actionTextDanger: { color: colors.error },

  comments: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  comment: { flexDirection: "row", gap: spacing.sm },
  commentLine: { ...type.small, fontSize: 13, color: colors.text },
  commentAuthor: { fontFamily: fonts.bold },
  commentText: { color: colors.text },
  commentMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  commentMeta: { ...type.caption, fontSize: 11, color: colors.textMuted },
  commentForm: { flexDirection: "row", alignItems: "center", gap: spacing.sm },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    ...type.body,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  reflectionInput: { minHeight: 96 },

  composerTitle: { ...type.title, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  composerHint: { ...type.small, color: colors.textMuted },

  imagePicker: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.pulseBg,
  },
  imagePreview: { width: "100%", aspectRatio: 1, borderRadius: radius.md },
  imagePickerIcon: { fontSize: 22 },
  imagePickerLabel: { ...type.label, fontSize: 13, color: colors.text, marginTop: 4 },
  imagePickerMeta: { ...type.caption, fontSize: 11, color: colors.textMuted, marginTop: 4 },

  sectionLabel: {
    ...type.label,
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },

  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },

  convList: { gap: spacing.md },
  convRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  searchResult: { marginTop: 4 },
  friendMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  convName: { ...type.label, fontSize: 14, color: colors.text },
  convLast: { ...type.caption, fontSize: 12, color: colors.textMuted },
  convLastUnread: { fontFamily: fonts.bold, color: colors.text },
  convWhen: { ...type.caption, fontSize: 10, color: colors.textMuted },
  requestActions: { flexDirection: "row", alignItems: "center", gap: 6 },

  smallBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  smallBtnPrimary: { backgroundColor: colors.pulsePrimary, borderColor: colors.pulsePrimary },
  smallBtnGhost: { backgroundColor: "transparent", borderColor: colors.border },
  smallBtnText: { ...type.caption, fontSize: 12, color: colors.text },
  smallBtnTextPrimary: { color: "#fff" },

  pillPending: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.pulseBgTintAlt,
  },
  pillPendingText: { ...type.caption, fontSize: 10, color: colors.pulsePrimaryDark },

  threadCard: { flex: 1, backgroundColor: colors.pulseBg },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  threadTitle: { ...type.title, fontFamily: fonts.bold, flex: 1, color: colors.text },
  threadScroll: { padding: spacing.lg, gap: spacing.sm },

  bubble: {
    maxWidth: "80%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: colors.pulsePrimary },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: colors.card },
  bubbleText: { ...type.body, fontSize: 14, color: colors.text },
  bubbleTextMine: { color: "#fff" },
  bubbleTextWithImage: { marginTop: spacing.sm },
  bubbleImage: {
    width: 220,
    height: 220,
    borderRadius: radius.md,
    marginBottom: 0,
  },
  bubbleTime: { ...type.caption, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  bubbleTimeMine: { color: "rgba(255,255,255,0.75)" },

  threadCompose: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});

export default Social;
