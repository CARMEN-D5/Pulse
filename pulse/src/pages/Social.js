import React, { useEffect, useMemo, useRef, useState } from "react";
import "./auth.css";
import "./social.css";

import {
  createPost,
  deletePost,
  getMyTodayPost,
  toggleLike,
  addComment,
  deleteComment,
  subscribeToFeed,
  subscribeToLikes,
  subscribeToComments,
} from "../firestore/social";
import { uploadPostImage, deletePostImage } from "../storage/uploads";
import { searchUserByEmail } from "../firestore/users";
import {
  getOrCreateConversation,
  sendMessage,
  subscribeToMessages,
  subscribeToConversations,
  markConversationRead,
} from "../firestore/messaging";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  unfriend,
  subscribeToFriendships,
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests,
} from "../firestore/friendship";

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
function Social({ user, onBack }) {
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
    <div className="social-shell">
      <div className="social-container">
        <div className="social-header">
          <button type="button" className="social-back" onClick={onBack}>
            ← Home
          </button>
          <h1>Social</h1>
          <div style={{ width: 60 }} />
        </div>

        {socialError && (
          <div className="alert alert-error" role="alert">
            <span>{socialError}</span>
            <button
              type="button"
              onClick={() => setSocialError("")}
              className="alert-dismiss"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        <div className="social-tabs" role="tablist">
          {[
            { id: "feed", label: "Feed" },
            { id: "today", label: "Today" },
            {
              id: "messages",
              label: messagesBadge > 0 ? `Messages (${messagesBadge})` : "Messages",
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "feed" && (
          <FeedTab
            user={user}
            visibleAuthorUids={visibleAuthorUids}
            friendUids={friendUids}
            onStartConversation={startConversation}
          />
        )}
        {tab === "today" && <TodayTab user={user} />}
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
      </div>

      {openThread && (
        <ThreadOverlay
          user={user}
          thread={openThread}
          onClose={() => setOpenThread(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function displayNameFor(u) {
  return (
    u?.displayName ||
    u?.name ||
    (u?.email ? u.email.split("@")[0] : null) ||
    "Someone"
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
      <div className="social-card alert alert-error" role="alert" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div><strong>Couldn't load the feed.</strong></div>
        <div style={{ fontSize: 13 }}>
          <code>{feedError.code || "unknown"}</code>
          {isIndex && " — Firestore needs a composite index on the posts collection. Click the link below to auto-create it (takes ~60 seconds)."}
          {isPerms && " — Firestore rules are blocking the read. Re-publish the rules in the Firebase Console."}
        </div>
        {urlMatch && (
          <a href={urlMatch[0]} target="_blank" rel="noreferrer" style={{ color: "var(--pulse-primary-dark)", wordBreak: "break-all", fontSize: 12 }}>
            {urlMatch[0]}
          </a>
        )}
        <div style={{ fontSize: 12, color: "var(--pulse-text-muted)" }}>
          Full message: {feedError.message}
        </div>
      </div>
    );
  }
  if (loading) {
    return <div className="social-card social-empty">Loading feed…</div>;
  }
  if (friendUids.size === 0 && posts.length === 0) {
    return (
      <div className="social-card social-empty">
        Add friends from the Messages tab to start seeing posts from people
        you know. Your own posts will show up here once you check in.
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <div className="social-card social-empty">
        Nothing here yet — be the first to share a moment from your day.
      </div>
    );
  }
  return (
    <>
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          user={user}
          onStartConversation={onStartConversation}
        />
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

  const onSubmitComment = async (e) => {
    e.preventDefault();
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
    if (!window.confirm("Delete this post?")) return;
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

  const hasImage = !!post.imageUrl;
  const slidesCount = hasImage ? 2 : 1;

  return (
    <article className="post-card">
      <div className="post-author">
        <div className="post-avatar">{initialsFor(post.authorName)}</div>
        <div>
          <div className="post-name">{post.authorName}</div>
          <div className="post-when">{timeAgo(post.createdAt)}</div>
        </div>
        {!isMine && (
          <button
            type="button"
            className="post-msg-btn"
            onClick={onMessageAuthor}
            aria-label="Message author"
          >
            💬 Message
          </button>
        )}
      </div>

      <div className="post-slides">
        {hasImage && slide === 0 && (
          <img
            src={post.imageUrl}
            alt="Post"
            className="post-slide-image"
          />
        )}
        {(slide === 1 || !hasImage) && (
          <div className="post-slide-reflection">
            <div className="post-slide-reflection-label">
              What I did to improve
            </div>
            {post.reflection}
          </div>
        )}
      </div>

      {slidesCount > 1 && (
        <div className="post-slide-nav">
          {[0, 1].map((i) => (
            <button
              key={i}
              type="button"
              className={`post-slide-dot ${slide === i ? "active" : ""}`}
              onClick={() => setSlide(i)}
              aria-label={`Show slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <div className="post-actions">
        <button
          type="button"
          className={`post-action-btn ${likeSummary.likedByMe ? "liked" : ""}`}
          onClick={onToggleLike}
        >
          {likeSummary.likedByMe ? "♥" : "♡"} {likeSummary.count}
        </button>
        <button
          type="button"
          className="post-action-btn"
          onClick={() => setShowComments((s) => !s)}
        >
          💬 {commentCount}
        </button>
        {isMine && (
          <button
            type="button"
            className="post-action-btn danger"
            onClick={onDeletePost}
            title="Delete post"
          >
            Delete
          </button>
        )}
      </div>

      {showComments && (
        <div className="comments">
          {comments.length === 0 ? (
            <div className="social-empty" style={{ padding: 8 }}>
              No comments yet — start the conversation.
            </div>
          ) : (
            comments.map((c) => (
              <div className="comment" key={c.id}>
                <div className="comment-avatar">{initialsFor(c.authorName)}</div>
                <div className="comment-body">
                  <div>
                    <strong style={{ fontSize: 13, marginRight: 6 }}>
                      {c.authorName}
                    </strong>
                    <span className="comment-text">{c.text}</span>
                  </div>
                  <div className="comment-meta">
                    {timeAgo(c.createdAt)}
                    {c.authorUid === user.uid && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => onDeleteComment(c.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--pulse-text-muted)",
                            cursor: "pointer",
                            padding: 0,
                            font: "inherit",
                          }}
                        >
                          delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <form className="comment-form" onSubmit={onSubmitComment}>
            <input
              type="text"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit" disabled={!commentText.trim() || submitting}>
              {submitting ? "…" : "Post"}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

// ============================================================================
// Today tab — compose or view your own post for today
// ============================================================================

function TodayTab({ user }) {
  const [myPost, setMyPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const refresh = async () => {
    setLoading(true);
    const res = await getMyTodayPost(user.uid);
    if (res.ok) setMyPost(res.data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [user.uid]);

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!reflection.trim()) {
      setError("Tell us what you did to improve today.");
      return;
    }

    setSubmitting(true);
    let uploaded = null;
    if (imageFile) {
      const up = await uploadPostImage(user.uid, imageFile);
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

    setImageFile(null);
    setImagePreview(null);
    setReflection("");
    refresh();
  };

  if (loading) {
    return <div className="social-card social-empty">Loading…</div>;
  }

  if (myPost) {
    // Already posted today — show their post inline.
    return (
      <>
        <div className="social-card composer">
          <h3>You've checked in today ✨</h3>
          <p className="composer-hint">
            Come back tomorrow to share another moment.
          </p>
        </div>
        <PostCard post={myPost} user={user} onDeleted={refresh} />
      </>
    );
  }

  return (
    <div className="social-card composer">
      <h3>Today's check-in</h3>
      <p className="composer-hint">
        Share one thing you did to improve today — a photo and a short note.
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="composer">
        <label className="image-picker">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickImage}
          />
          {imagePreview ? (
            <div className="image-picker-preview">
              <img src={imagePreview} alt="Preview" />
              <div className="image-picker-meta">
                Tap to choose a different image
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 22 }}>📷</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>
                Add a photo (optional)
              </div>
              <div className="image-picker-meta">JPG / PNG, up to 5 MB</div>
            </div>
          )}
        </label>

        <textarea
          className="reflection-input"
          placeholder="What did you do to improve today?"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? "Posting…" : "Share today's check-in"}
        </button>
      </form>
    </div>
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
  const onSearch = async (e) => {
    e.preventDefault();
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
    if (!window.confirm(`Remove ${name || "this friend"} from your friends?`)) {
      return;
    }
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
      <div className="social-card">
        <div className="composer">
          <h3 style={{ margin: 0, fontSize: 16 }}>Add a friend</h3>
          <p className="composer-hint" style={{ marginTop: -4 }}>
            Search for a Pulse user by email and send a friend request.
            Once they accept, you'll see each other's posts and be able to
            message.
          </p>
          <form className="search-row" onSubmit={onSearch}>
            <input
              type="email"
              placeholder="friend@example.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "auto" }}
            >
              Find
            </button>
          </form>

          {searchState.status === "loading" && (
            <div className="composer-hint">Searching…</div>
          )}
          {searchState.status === "not_found" && (
            <div className="composer-hint">No Pulse user with that email.</div>
          )}
          {searchState.status === "self" && (
            <div className="composer-hint">That's you 🙂</div>
          )}
          {searchState.status === "error" && (
            <div className="alert alert-error">{searchState.message}</div>
          )}
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
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Incoming friend requests                                      */}
      {/* ------------------------------------------------------------ */}
      {incomingRequests.length > 0 && (
        <div className="social-card">
          <SectionLabel>Friend requests</SectionLabel>
          <div className="conv-list">
            {incomingRequests.map((r) => (
              <div key={r.id} className="conv-row request-row">
                <div className="conv-avatar">
                  {initialsFor(r.fromName || r.fromEmail)}
                </div>
                <div className="conv-body">
                  <div className="conv-name">
                    {r.fromName || r.fromEmail || "Someone"}
                  </div>
                  <div className="conv-last">{r.fromEmail}</div>
                </div>
                <div className="request-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => onAccept(r.id)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => onDecline(r.id)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Outgoing pending requests                                     */}
      {/* ------------------------------------------------------------ */}
      {outgoingRequests.length > 0 && (
        <div className="social-card">
          <SectionLabel>Pending</SectionLabel>
          <div className="conv-list">
            {outgoingRequests.map((r) => (
              <div key={r.id} className="conv-row request-row">
                <div className="conv-avatar">
                  {initialsFor(r.toName || r.toEmail)}
                </div>
                <div className="conv-body">
                  <div className="conv-name">
                    {r.toName || r.toEmail || "Someone"}
                  </div>
                  <div className="conv-last">Request sent ⏳</div>
                </div>
                <div className="request-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => onDecline(r.id)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Friends list — tap a friend to open or create a DM thread     */}
      {/* ------------------------------------------------------------ */}
      <div className="social-card">
        <SectionLabel>Friends</SectionLabel>
        {sortedFriendships.length === 0 ? (
          <div className="social-empty">
            No friends yet. Use the search above to send your first request.
          </div>
        ) : (
          <div className="conv-list">
            {sortedFriendships.map((f) => {
              const otherUid = (f.participants || []).find(
                (p) => p !== user.uid
              );
              const info = f.participantInfo?.[otherUid] || {};
              const name = info.name || info.email || "Someone";
              const conv = convByOther[otherUid];
              const unread = conv ? isUnread(conv) : false;
              return (
                <div
                  key={f.id}
                  className={`conv-row friend-row ${unread ? "has-unread" : ""}`}
                >
                  <button
                    type="button"
                    className="friend-main"
                    onClick={() => {
                      const c = convByOther[otherUid];
                      if (c) {
                        onOpenThread({
                          convId: c.id,
                          otherUid,
                          otherName: name,
                        });
                      } else {
                        onOpenFriendChat(otherUid, info);
                      }
                    }}
                  >
                    <div className="conv-avatar">
                      {initialsFor(name)}
                      {unread && <span className="unread-dot" aria-hidden />}
                    </div>
                    <div className="conv-body">
                      <div className="conv-name">{name}</div>
                      <div className={`conv-last ${unread ? "unread" : ""}`}>
                        {conv?.lastMessage || "Say hi 👋"}
                      </div>
                    </div>
                    <div className="conv-when">
                      {conv?.lastMessageAt ? timeAgo(conv.lastMessageAt) : ""}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="unfriend-btn"
                    onClick={() => onUnfriend(otherUid, name)}
                    aria-label={`Remove ${name} from friends`}
                    title="Remove friend"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Small presentational helpers used by MessagesTab
// ============================================================================

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: "var(--pulse-text-muted)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
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
function SearchResultRow({
  other,
  rel,
  onAccept,
  onDecline,
  onSendRequest,
  onOpenChat,
}) {
  const name = other.displayName || other.email?.split("@")[0] || "Someone";
  const isObj = rel && typeof rel === "object";

  return (
    <div className="conv-row search-result" style={{ marginTop: 4 }}>
      <div className="conv-avatar">{initialsFor(name)}</div>
      <div className="conv-body">
        <div className="conv-name">{name}</div>
        <div className="conv-last">{other.email}</div>
      </div>
      <div className="request-actions">
        {rel === "friend" && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onOpenChat}
          >
            Message
          </button>
        )}
        {rel === "none" && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onSendRequest}
          >
            Add friend
          </button>
        )}
        {isObj && rel.kind === "outgoing" && (
          <>
            <span className="pill pill-pending">Request sent</span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => onDecline(rel.request.id)}
            >
              Cancel
            </button>
          </>
        )}
        {isObj && rel.kind === "incoming" && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => onAccept(rel.request.id)}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => onDecline(rel.request.id)}
            >
              Decline
            </button>
          </>
        )}
      </div>
    </div>
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
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (thread?.convId && user?.uid && messages.length > 0) {
      markConversationRead(thread.convId, user.uid);
    }
  }, [messages.length, thread?.convId, user?.uid]);

  const onSend = async (e) => {
    e.preventDefault();
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
    <div className="thread-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="thread-card">
        <div className="thread-header">
          <button
            type="button"
            className="thread-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
          <div className="conv-avatar">{initialsFor(thread.otherName)}</div>
          <div className="thread-title">{thread.otherName}</div>
        </div>

        <div className="thread-scroll" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="social-empty">
              No messages yet. Say hi 👋
            </div>
          )}
          {messages.map((m) => {
            const mine = m.senderUid === user.uid;
            return (
              <div
                key={m.id}
                className={`msg-bubble ${mine ? "mine" : "theirs"}`}
              >
                {m.text}
                <div className="msg-time">{timeAgo(m.createdAt)}</div>
              </div>
            );
          })}
        </div>

        <form className="thread-compose" onSubmit={onSend}>
          <input
            type="text"
            placeholder="Message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" disabled={!text.trim() || sending}>
            {sending ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Social;
