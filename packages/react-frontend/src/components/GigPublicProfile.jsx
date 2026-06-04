import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../api/api.js";

const GigPublicProfile = ({
  isLoggedIn,
  userRole,
  venueId,
  onStartConversation,
}) => {
  const { id } = useParams();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/gigs/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setGig(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching gig:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="loading">Loading Gig Profile...</div>;
  if (!gig) return <div className="error">Gig not found.</div>;

  return (
    <div className="band-profile-page">
      <div className="band-header">
        <h1 className="band-title" style={{ textTransform: "capitalize" }}>{gig.name}</h1>
        <p className="band-genre">{gig.genres?.join(", ") || "General Event"}</p>
        {isLoggedIn && userRole === "Artist" && (
          <button
            type="button"
            className="primary-btn"
            onClick={() => onStartConversation(gig)}
          >
            Message Venue Host
          </button>
        )}
      </div>

      <section className="band-section">
        <h3>About the Gig</h3>
        <p className="band-bio">{gig.description || "No description available yet."}</p>
      </section>

      <section className="band-section">
        <h3>Event Details</h3>
        <p className="band-bio">
          <strong>Address:</strong> {gig.address || "Contact Host for address"} <br />
          <strong>Capacity:</strong> {gig.capacity} people <br />
          <strong>Compensation Matrix:</strong> ${gig.price_range?.[0]} - ${gig.price_range?.[1]}
        </p>
      </section>

      <section className="band-section">
        <h3>Gallery</h3>
        <div className="horizontal-scroll-container">
          {gig.gallery_images?.length > 0 ? (
            gig.gallery_images.map((img, index) => (
              <img key={index} src={img} alt="Gig Venue Gallery" className="scroll-img" />
            ))
          ) : (
            <p>No photos uploaded yet.</p>
          )}
        </div>
      </section>

      <section className="band-section">
        <h3>Videos</h3>
        <div className="horizontal-scroll-container">
          {gig.video_urls?.length > 0 ? (
            gig.video_urls.map((videoUrl, index) => {
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

export default GigPublicProfile;