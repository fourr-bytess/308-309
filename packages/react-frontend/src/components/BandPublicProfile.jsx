import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const BandPublicProfile = ({
  isLoggedIn,
  userRole,
  venueId,
  onStartConversation,
}) => {
  const { id } = useParams();
  const [band, setBand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:3001/bands/${id}`)
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

  if (loading) return <div className="loading">Loading Band Profile...</div>;
  if (!band) return <div className="error">Band not found.</div>;

  return (
    <div className="band-profile-page">
      {/* 1. Band Name & Genre (Top Left, under the main logo) */}
      <div className="band-header">
        <h1 className="band-title">{band.name}</h1>
        <p className="band-genre">{band.genre}</p>
         {isLoggedIn && userRole === "Venue" && venueId && (
    <button
      type="button"
      className="primary-btn"
      onClick={() => onStartConversation(band)}
    >
      Message Band
    </button>
  )}
      </div>

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
              const videoId = videoUrl.includes("v=") ? videoUrl.split("v=")[1].split("&")[0] : videoUrl;
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