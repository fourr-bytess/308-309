import { useState } from "react";

export default function Gigs({ gigs }) {
  const [selectedGenre, setSelectedGenre] = useState("All");

  const now = new Date();
  const oneWeek = new Date();
  oneWeek.setDate(now.getDate() + 7);

  const filteredGigs = gigs.filter((gig) => {
    const gigDate = new Date(gig.date);

    // Only show gigs happening between today and 7 days from now
    if (gigDate < now || gigDate > oneWeek) {
      return false;
    }

    // Genre filter
    if (
      selectedGenre !== "All" &&
      !gig.genres?.includes(selectedGenre.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  return (
    <section id="gigs" className="page active">
      <h2>Available Gigs This Week</h2>

      <div className="search-row">
        <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
          <option>All</option>
          <option>Jazz</option>
          <option>Rock</option>
          <option>Pop</option>
          <option>Country</option>
          <option>Hip-Hop</option>
        </select>
      </div>

      <div className="card-grid">
        {filteredGigs.length === 0 ? (
          <p style={{ color: "white" }}>No gigs match your filters this week.</p>
        ) : (
          filteredGigs.map((gig) => (
            <div key={gig._id} className="card band-card">
              <h3>{gig.name}</h3>

              <p>
                <strong>Date:</strong>{" "}
                {gig.date ? new Date(gig.date).toLocaleDateString() : "No date"}
              </p>

              <p>
                <strong>Location:</strong> {gig.location || "No location"}
              </p>

              <p>
                <strong>Genre:</strong>{" "}
                {gig.genres?.length ? gig.genres.join(", ") : "No genre"}
              </p>

              <p>
                <strong>Pay:</strong> ${gig.price_range?.[0] ?? 0} - $
                {gig.price_range?.[1] ?? 0}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}