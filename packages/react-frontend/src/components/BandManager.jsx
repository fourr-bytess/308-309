import { useState } from "react";
import { addBandMember, removeBandMember } from "../api/api.js";

export default function BandManager({
  bandDetails,
  currentUserId,
  onBandUpdated,
}) {
  const [memberEmailToAdd, setMemberEmailToAdd] = useState("");
  const [message, setMessage] = useState("");

  const isBandAdmin =
    bandDetails?.owner_user &&
    String(bandDetails.owner_user) === String(currentUserId);

  if (!bandDetails || !isBandAdmin) {
    return null;
  }

  async function handleAddMember() {
    setMessage("");

    if (!memberEmailToAdd.trim()) {
      setMessage("Enter a musician email to add.");
      return;
    }

    const result = await addBandMember(bandDetails._id, {
      email: memberEmailToAdd.trim(),
    });

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setMessage("Member added.");
    setMemberEmailToAdd("");
    onBandUpdated(result.data);
  }

  async function handleRemoveMember(memberId) {
    setMessage("");

    const result = await removeBandMember(bandDetails._id, memberId);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setMessage("Member removed.");
    onBandUpdated(result.data);
  }

  return (
    <div className="band-manager-box">
      <h3>Band Admin</h3>
      <p>Manage members for this band.</p>

      <div className="band-manager-add-row">
        <input
          className="edit-input"
          type="email"
          placeholder="Musician email"
          value={memberEmailToAdd}
          onChange={(event) => setMemberEmailToAdd(event.target.value)}
        />

        <button
          type="button"
          className="secondary-btn"
          onClick={handleAddMember}
        >
          Add Member
        </button>
      </div>

      <h4>Current Members</h4>

      <div className="band-manager-member-list">
        {(bandDetails.members || []).map((memberId) => (
          <div key={memberId} className="band-manager-member-row">
            <span>{memberId}</span>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => handleRemoveMember(memberId)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {message && <p className="upload-message">{message}</p>}
    </div>
  );
}