const API_URL = "http://localhost:3001";

/* ---------------- BANDS ---------------- */

export async function getBands() {
  const res = await fetch(`${API_URL}/bands`);
  const data = await res.json();
  return data.data;
}

export async function getBandById(id) {
  const res = await fetch(`${API_URL}/bands/${id}`);
  const data = await res.json();
  return data.data;
}

export async function createBand(band) {
  const res = await fetch(`${API_URL}/bands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(band),
  });

  return res.json();
}

export async function deleteBand(id) {
  const res = await fetch(`${API_URL}/bands/${id}`, {
    method: "DELETE",
  });

  return res.json();
}


/* ---------------- VENUES ---------------- */

export async function getVenues() {
  const res = await fetch(`${API_URL}/venues`);
  const data = await res.json();
  return data.data;
}

export async function createVenue(venue) {
  const res = await fetch(`${API_URL}/venues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(venue),
  });

  return res.json();
}

export async function deleteVenue(id) {
  const res = await fetch(`${API_URL}/venues/${id}`, {
    method: "DELETE",
  });

  return res.json();
}


/* ---------------- MUSICIANS ---------------- */

export async function getMusicians() {
  const res = await fetch(`${API_URL}/musicians`);
  const data = await res.json();
  return data.data;
}

export async function createMusician(musician) {
  const res = await fetch(`${API_URL}/musicians`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(musician),
  });

  return res.json();
}


/* ---------------- REVIEWS ---------------- */

export async function getReviews() {
  const res = await fetch(`${API_URL}/reviews`);
  const data = await res.json();
  return data.data;
}

export async function createReview(review) {
  const res = await fetch(`${API_URL}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(review),
  });

  return res.json();
}

// Conversations - Jose
export async function getConversations(){
  const res = await fetch(`${API_URL}/conversations`);
  const data = await res.json();
  return data.data;
}
export async function getConversationsById(id){
  const res = await fetch(`${API_URL}/conversations/${id}`);
  const data = await res.json();
  return data.data;
}

export async function createConversation(message){
  const res = await fetch(`${API_URL}/conversations`,{
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  return res.json();
}

export async function deleteConversationById(id){
  const res = await fetch(`${API_URL}/conversations/${id}`, {
    method: "DELETE",
  });
}