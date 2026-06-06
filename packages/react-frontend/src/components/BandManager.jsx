import { useEffect, useState } from "react";
import {
  addBandMember,
  removeBandMember,
  addBandCoAdmin,
  removeBandCoAdmin,
  transferBandAdmin,
  getBandMembers,
} from "../api/api.js";

export default function BandManager({
  bandDetails,
  currentUserId,
  onBandUpdated,
}) {
  const [memberEmailToAdd, setMemberEmailToAdd] = useState("");
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");

  const isBandAdmin =
    String(bandDetails?.admin_user || bandDetails?.owner_user || "") ===
    String(currentUserId);

  const isBandCoAdmin = (bandDetails?.co_admin_users || []).some(
    (userId) => String(userId) === String(currentUserId),
  );

  const canManageMembers = isBandAdmin || isBandCoAdmin;

  useEffect(() => {
    async function loadMembers() {
      if (!bandDetails?._id) return;

      try {
        const data = await getBandMembers(bandDetails._id);
        setMembers(data || []);
      } catch (err) {
        setMessage(err?.message || "Failed to load band members.");
      }
    }

    loadMembers();
  }, [bandDetails?._id, bandDetails?.members]);

  if (!bandDetails || !canManageMembers) {
    return null;
  }

  async function refreshMembers() {
    const data = await getBandMembers(bandDetails._id);
    setMembers(data || []);
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
    await refreshMembers();
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
    await refreshMembers();
  }

  async function handleToggleCoAdmin(member) {
    setMessage("");

    const isAlreadyCoAdmin = (bandDetails.co_admin_users || []).some(
      (coAdminId) => String(coAdminId) === String(member.owner_user),
    );

    const result = isAlreadyCoAdmin
      ? await removeBandCoAdmin(bandDetails._id, member._id)
      : await addBandCoAdmin(bandDetails._id, member._id);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setMessage(isAlreadyCoAdmin ? "Co-admin removed." : "Co-admin added.");
    onBandUpdated(result.data);
  }

  async function handleTransferAdmin(member) {
    setMessage("");

    const confirmed = window.confirm(
      `Are you sure you want to transfer main admin rights to ${member.name}?`,
    );

    if (!confirmed) return;

    const result = await transferBandAdmin(bandDetails._id, member._id);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setMessage("Admin rights transferred.");
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
        {members.map((member) => {
          const isThisMemberAdmin =
            String(member.owner_user) ===
            String(bandDetails.admin_user || bandDetails.owner_user);

          const isThisMemberCoAdmin = (bandDetails.co_admin_users || []).some(
            (coAdminId) => String(coAdminId) === String(member.owner_user),
          );

          return (
            <div key={member._id} className="band-manager-member-row">
              <span>
                {member.name || "Unnamed musician"}
                {isThisMemberAdmin && " (Admin)"}
                {isThisMemberCoAdmin && " (Co-Admin)"}
              </span>

              {!isThisMemberAdmin && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleRemoveMember(member._id)}
                >
                  Remove
                </button>
              )}

              {isBandAdmin && !isThisMemberAdmin && (
                <>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handleToggleCoAdmin(member)}
                  >
                    {isThisMemberCoAdmin ? "Remove Co-Admin" : "Make Co-Admin"}
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handleTransferAdmin(member)}
                  >
                    Transfer Admin
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {message && <p className="upload-message">{message}</p>}
    </div>
  );
}
