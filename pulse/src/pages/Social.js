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
} from "../firestore/messaging";

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
  // Top-level error banner — used when conversation creation fails so the
  // user isn't left wondering why nothing happened.
  const [socialError, setSocialError] = useState("");

  const startConversation = async (otherUser) => {
    setSocialError("");
    const res = await getOrCreateConversation(
      { uid: user.uid, name: displayNameFor(user), email: user.email },
      otherUser
    );
    if (res.ok) {
      setOpenThread({
        convId: res.data.id,
        otherUid: otherUser.uid,
        otherName: otherUser.displayName || otherUser.name || otherUser.email,
      });
    } else {
      setSocialError(res.error || "Couldn't open that conversation.");
    }
  };

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
            {socialError}
          </div>
        )}

        <div className="social-tabs" role="tablist">
          {[
            { id: "feed", label: "Feed" },
            { id: "today", label: "Today" },
            { id: "messages", label: "Messages" },
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
          <FeedTab user={user} onStartConversation={startConversation} />
        )}
        {tab === "today" && <TodayTab user={user} />}
        {tab === "messages" && (
          <MessagesTab
            user={user}
            onOpenThread={(t) => setOpenThread(t)}
            onStartConversation={startConversation}
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

function FeedTab({ user, onStartConversation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live feed subscription. New posts (from anyone) appear automatically.
  useEffect(() => {
    const unsub = subscribeToFeed((incoming) => {
      setPosts(incoming);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className="social-card social-empty">Loading feed…</div>;
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

function MessagesTab({ user, onOpenThread, onStartConversation }) {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchState, setSearchState] = useState({ status: "idle" });

  // Live conversation list — new conversations and last-message previews
  // update without a refresh.
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToConversations(user.uid, (list) => {
      setConvs(list);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

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

  const onPick = async (otherUser) => {
    setSearchState({ status: "idle" });
    setSearchEmail("");
    await onStartConversation({
      uid: otherUser.uid,
      name: otherUser.displayName,
      email: otherUser.email,
      displayName: otherUser.displayName,
    });
    // No manual refresh — subscribeToConversations will pick up the new doc.
  };

  return (
    <>
      <div className="social-card">
        <div className="composer">
          <h3 style={{ margin: 0, fontSize: 16 }}>Start a new conversation</h3>
          <p className="composer-hint" style={{ marginTop: -4 }}>
            Search for a Pulse user by email.
          </p>
          <form className="search-row" onSubmit={onSearch}>
            <input
              type="email"
              placeholder="friend@example.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ width: "auto" }}>
              Find
            </button>
          </form>

          {searchState.status === "loading" && (
            <div className="composer-hint">Searching…</div>
          )}
          {searchState.status === "not_found" && (
            <div className="composer-hint">
              No Pulse user with that email.
            </div>
          )}
          {searchState.status === "self" && (
            <div className="composer-hint">That's you 🙂</div>
          )}
          {searchState.status === "error" && (
            <div className="alert alert-error">{searchState.message}</div>
          )}
          {searchState.status === "found" && (
            <button
              type="button"
              className="conv-row"
              onClick={() => onPick(searchState.user)}
              style={{ marginTop: 4 }}
            >
              <div className="conv-avatar">
                {initialsFor(
                  searchState.user.displayName || searchState.user.email
                )}
              </div>
              <div className="conv-body">
                <div className="conv-name">
                  {searchState.user.displayName ||
                    searchState.user.email.split("@")[0]}
                </div>
                <div className="conv-last">
                  Start a conversation with {searchState.user.email}
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="social-card">
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
          Conversations
        </div>
        {loading ? (
          <div className="social-empty">Loading…</div>
        ) : convs.length === 0 ? (
          <div className="social-empty">
            No conversations yet — search for someone above to say hi.
          </div>
        ) : (
          <div className="conv-list">
            {convs.map((c) => {
              const otherUid = c.participants.find((p) => p !== user.uid);
              const info = c.participantInfo?.[otherUid] || {};
              const name = info.name || info.email || "Someone";
              return (
                <button
                  key={c.id}
                  type="button"
                  className="conv-row"
                  onClick={() =>
                    onOpenThread({
                      convId: c.id,
                      otherUid,
                      otherName: name,
                    })
                  }
                >
                  <div className="conv-avatar">{initialsFor(name)}</div>
                  <div className="conv-body">
                    <div className="conv-name">{name}</div>
                    <div className="conv-last">
                      {c.lastMessage || "Say hi 👋"}
                    </div>
                  </div>
                  <div className="conv-when">{timeAgo(c.lastMessageAt)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
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

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

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
