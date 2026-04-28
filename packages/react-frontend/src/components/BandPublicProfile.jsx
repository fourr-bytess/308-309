import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const BandPublicProfile = () => {
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
    <div className="band-profile-container" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ borderBottom: "2px solid #eee", marginBottom: "30px" }}>
        <h1>{band.name}</h1>
        <p style={{ fontSize: "1.2rem", fontStyle: "italic", color: "#666" }}>{band.genre}</p>
      </header>

      <section className="bio-section" style={{ marginBottom: "40px" }}>
        <h3>About the Band</h3>
        <p style={{ lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{band.bio || "No bio available yet."}</p>
      </section>

      <section className="gallery-section" style={{ marginBottom: "40px" }}>
        <h3>Gallery</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "15px" }}>
          {band.gallery_images?.length > 0 ? (
            band.gallery_images.map((img, index) => (
              <img key={index} src={img} alt={`${band.name} gallery ${index}`} style={{ width: "100%", borderRadius: "8px", objectFit: "cover", height: "200px" }} />
            ))
          ) : (
            <p>No photos uploaded yet.</p>
          )}
        </div>
      </section>

      <section className="video-section">
        <h3>Videos</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {band.video_urls?.length > 0 ? (
            band.video_urls.map((videoUrl, index) => {
              // Extract YouTube ID (works for full URLs or just IDs)
              const videoId = videoUrl.includes("v=") ? videoUrl.split("v=")[1].split("&")[0] : videoUrl;
              return (
                <div key={index} className="video-responsive">
                  <iframe
                    width="100%"
                    height="450"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ borderRadius: "12px" }}
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