import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function ManageGig({ venueId, gigs, navigate, authFetch, onUploadGallery, onRemoveGallery }) {
  const { id } = useParams();
  
  const currentGig = (gigs || []).find((g) => String(g._id) === String(id));

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    capacity: "",
    minPrice: "",
    maxPrice: "",
    video_urls: "",
  });
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    if (currentGig) {
      setFormData({
        name: currentGig.name || "",
        description: currentGig.description || "",
        address: currentGig.address || "",
        capacity: currentGig.capacity || "",
        minPrice: currentGig.price_range?.[0] || "",
        maxPrice: currentGig.price_range?.[1] || "",
        video_urls: Array.isArray(currentGig.video_urls) ? currentGig.video_urls.join(", ") : "",
      });
    }
  }, [currentGig]);

  if (!currentGig) {
    return <div className="list-empty-message" style={{ padding: "40px", color: "white" }}>Loading gig profile...</div>;
  }

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    try {
      setSyncMessage("");
      const min = parseFloat(formData.minPrice) || 0;
      const max = parseFloat(formData.maxPrice) || 0;
      if (max < min) {
        setSyncMessage("Error: Max Pay cannot be less than Min Pay.");
        return;
      }

      const videosArray = formData.video_urls
        ? formData.video_urls.split(",").map((v) => v.trim()).filter(Boolean)
        : [];

      const updatedPayload = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        capacity: parseInt(formData.capacity, 10) || 0,
        price_range: [min, max],
        video_urls: videosArray,
      };

      const response = await authFetch(`/gigs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update gig details.");

      setSyncMessage("Gig details updated successfully!");
    } catch (err) {
      console.error("Error saving gig:", err);
      setSyncMessage(err.message || "An error occurred while saving.");
    }
  };

  return (
    <section id="bands" className="page active" style={{ paddingTop: "120px" }}>
      <div className="profile-popup band-profile-popup">
        <h2>Manage Gig: {currentGig.name}</h2>

        <div className="profile-row upload-row">
          <span className="label">Add Gallery Photo</span>
          <input
            className="edit-input"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onUploadGallery(currentGig._id, file);
              }
            }}
          />
        </div>

        <h3 className="gallery-title">Gallery</h3>

        <div className="gallery-grid">
            {(currentGig.gallery_images || []).length === 0 && (
                <p className="gallery-empty">No gallery images yet.</p>
            )}

            {(currentGig.gallery_images || []).map((imageUrl) => (
                <div className="gallery-item" key={imageUrl}>
                {/* Absolute URL format directly provided by backend — exactly like bands! */}
                <img src={imageUrl} alt="Gig gallery" />
                <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => onRemoveGallery(currentGig._id, imageUrl)}
                >
                    Remove
                </button>
                </div>
            ))}
            </div>

        <hr style={{ margin: "30px 0", opacity: 0.2 }} />

        <form onSubmit={handleSaveChanges} className="create-band-form" style={{ background: "transparent", padding: 0 }}>
          <h3>Edit Details</h3>
          
          <input 
            type="text"
            placeholder="Gig Title"
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />

          <input 
            type="text"
            placeholder="Description"
            value={formData.description} 
            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
          />

          <input 
            type="text"
            placeholder="Street Address"
            value={formData.address} 
            onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
          />

          <div className="create-band-price-row">
            <input 
              type="number"
              placeholder="Capacity"
              value={formData.capacity} 
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} 
            />
            <input 
              type="number"
              placeholder="Min Pay"
              value={formData.minPrice} 
              onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })} 
            />
            <input 
              type="number"
              placeholder="Max Pay"
              value={formData.maxPrice} 
              onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })} 
            />
          </div>
          
          <input 
            type="text"
            placeholder="YouTube Video IDs (comma separated)"
            value={formData.video_urls} 
            onChange={(e) => setFormData({ ...formData, video_urls: e.target.value })} 
          />

          {syncMessage && <p className="upload-message" style={{ color: "#ffd447" }}>{syncMessage}</p>}

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button type="submit" className="primary-btn" style={{ margin: 0, flex: 1 }}>
              Save Changes
            </button>
            <button type="button" className="secondary-btn" onClick={() => navigate("/manage-gigs")} style={{ margin: 0, flex: 1 }}>
              Back to List
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}