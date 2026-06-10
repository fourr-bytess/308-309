import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../api/api.js";

const BandPublicProfile = ({
  isLoggedIn,
  userRole,
  venueId,
  venueGigs = [],
  ownBandIds = [],
  onStartConversation,
  onInviteToGig,
  inviteMessage = "",
  inviteError = "",
}) => {
  const { id } = useParams();
  const [band, setBand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGigPicker, setShowGigPicker] = useState(false);
  const [selectedGigId, setSelectedGigId] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/bands/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setBand(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching band:", err);
        setLoading(false);
      });
  }, [id]);

  const openGigs = venueGigs.filter((gig) => !gig.booked);

  function handleInviteClick() {
    if (openGigs.length === 0) {
      return;
    }
    if (openGigs.length === 1) {
      onInviteToGig?.(band, openGigs[0]._id);
      return;
    }
    setSelectedGigId(openGigs[0]._id);
    setShowGigPicker(true);
  }

  function handleConfirmInvite() {
    if (!selectedGigId) return;
    onInviteToGig?.(band, selectedGigId);
    setShowGigPicker(false);
  }

  if (loading) return <div className="loading">Loading Band Profile...</div>;
  if (!band) return <div className="error">Band not found.</div>;

  return (
    <div className="band-profile-page">
      <div className="band-header">
        <h1 className="band-title">{band.name}</h1>
        <p className="band-genre">{band.genre}</p>
        {isLoggedIn && userRole === "Venue" && venueId && (
          <div className="request-card-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleInviteClick}
              disabled={openGigs.length === 0}
            >
              {openGigs.length === 0
                ? "No open gigs to book"
                : "Request to Book Band"}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onStartConversation(band)}
            >
              Message Band
            </button>
          </div>
        )}
        {isLoggedIn &&
          userRole === "Artist" &&
          !ownBandIds.includes(String(band._id)) && (
            <div className="request-card-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onStartConversation(band)}
              >
                Message Band
              </button>
            </div>
          )}
        {inviteMessage && <p className="upload-message">{inviteMessage}</p>}
        {inviteError && <p className="notification-error">{inviteError}</p>}
      </div>

      {showGigPicker && (
        <div className="dashboard-card" style={{ margin: "16px 0" }}>
          <h3>Select a gig</h3>
          <select
            value={selectedGigId}
            onChange={(event) => setSelectedGigId(event.target.value)}
            style={{ width: "100%", marginBottom: "12px" }}
          >
            {openGigs.map((gig) => (
              <option key={gig._id} value={gig._id}>
                {gig.name}
                {gig.date
                  ? ` — ${new Date(gig.date).toLocaleDateString()}`
                  : ""}
              </option>
            ))}
          </select>
          <div className="request-card-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleConfirmInvite}
            >
              Send Booking Request
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setShowGigPicker(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className="band-section">
        <h3>About the Band</h3>
        <p className="band-bio">{band.bio || "No bio available yet."}</p>
      </section>

      <section className="band-section">
        <h3>Gallery</h3>
        <div className="horizontal-scroll-container">
          {band.gallery_images?.length > 0 ? (
            band.gallery_images.map((img, index) => (
              <img key={index} src={img} alt="Gallery" className="scroll-img" />
            ))
          ) : (
            <p>No photos uploaded yet.</p>
          )}
        </div>
      </section>

      <section className="band-section">
        <h3>Videos</h3>
        <div className="horizontal-scroll-container">
          {band.video_urls?.length > 0 ? (
            band.video_urls.map((videoUrl, index) => {
              const videoId = videoUrl.includes("v=")
                ? videoUrl.split("v=")[1].split("&")[0]
                : videoUrl;
              return (
                <div key={index} className="scroll-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                </div>
              );
            })
          ) : (
            <p>No videos available.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default BandPublicProfile;
