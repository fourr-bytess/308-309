import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import {
  getAvailability,
  createAvailability,
  deleteAvailability,
} from "../api/api";

export default function AvailabilityCalendar({
  ownerType,
  ownerId,
  gigs = [],
  gigRequests = [],
  readOnly = false,
  compact = false,
  title = "Schedule",
}) {
  const [slots, setSlots] = useState([]);
  const [message, setMessage] = useState("");

  async function loadSlots() {
    try {
      const result = await getAvailability(ownerType, ownerId);
      setSlots(result.data || []);
    } catch {
      setMessage("Failed to load availability.");
    }
  }

  useEffect(() => {
    if (ownerType && ownerId) {
      loadSlots();
    }
  }, [ownerType, ownerId]);

  const availabilityEvents = slots.map((slot) => ({
    id: slot._id,
    title: formatStatusLabel(slot.status),
    start: slot.start,
    end: slot.end,
    backgroundColor: getStatusColor(slot.status),
    borderColor: getStatusColor(slot.status),
    extendedProps: { eventType: "availability" },
  }));

  const gigEvents = gigs.map((gig) => ({
    id: `gig-${gig._id}`,
    title: `${gig.booked ? "Booked" : "Open gig"}: ${gig.name}`,
    start: getGigStart(gig),
    end: getGigEnd(gig),
    backgroundColor: gig.booked ? "#3b82f6" : "#8b5cf6",
    borderColor: gig.booked ? "#3b82f6" : "#8b5cf6",
    extendedProps: { eventType: "gig" },
  }));

  const requestEvents = gigRequests.map((request) => {
    const gig = request.gigId;
    return {
      id: `request-${request._id}`,
      title: `${formatStatusLabel(request.status)}: ${gig?.name || "Gig request"}`,
      start: getGigStart(gig),
      end: getGigEnd(gig),
      backgroundColor: getStatusColor(request.status),
      borderColor: getStatusColor(request.status),
      extendedProps: { eventType: "gig-request" },
    };
  });

  const events = [...availabilityEvents, ...gigEvents, ...requestEvents];

  async function handleSelect(selection) {
    if (readOnly) return;

    const status = window.prompt(
      "Enter status: available or unavailable",
      "available",
    );

    if (!status) return;

    try {
      await createAvailability({
        ownerType,
        ownerId,
        start: selection.startStr,
        end: selection.endStr,
        status,
      });

      setMessage("Availability saved.");
      await loadSlots();
    } catch {
      setMessage("Failed to save availability.");
    }
  }

  async function handleEventClick(info) {
    if (readOnly) return;

    if (info.event.extendedProps.eventType === "gig") {
      setMessage("Gig events are managed from the Create Gig form.");
      return;
    }

    const shouldDelete = window.confirm("Delete this availability slot?");
    if (!shouldDelete) return;

    try {
      await deleteAvailability(info.event.id);
      setMessage("Availability deleted.");
      await loadSlots();
    } catch {
      setMessage("Failed to delete availability.");
    }
  }

  return (
    <section
      className={`availability-calendar ${compact ? "calendar-compact" : ""}`}
    >
      <h2>{title}</h2>

      <div className="calendar-legend">
        <span>
          <i className="legend-dot available-dot" /> Available
        </span>
        <span>
          <i className="legend-dot open-gig-dot" /> Open gig
        </span>
        <span>
          <i className="legend-dot booked-dot" /> Booked
        </span>
        <span>
          <i className="legend-dot pending-dot" /> Pending
        </span>
        <span className="default-unavailable-note">
          Unmarked time is unavailable by default.
        </span>
      </div>

      {message && <p>{message}</p>}

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={compact ? "dayGridMonth" : "timeGridWeek"}
        selectable={!readOnly}
        events={events}
        select={handleSelect}
        eventClick={handleEventClick}
        height="auto"
        headerToolbar={
          compact
            ? {
                left: "prev,next",
                center: "title",
                right: "",
              }
            : {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }
        }
      />
    </section>
  );
}

function formatStatusLabel(status) {
  if (status === "available") return "Available";
  if (status === "unavailable") return "Unavailable";
  if (status === "pending") return "Pending";
  if (status === "booked") return "Booked";
  return status;
}

function getStatusColor(status) {
  if (status === "available") return "#22c55e";
  if (status === "unavailable") return "#ef4444";
  if (status === "pending") return "#f59e0b";
  if (status === "accepted") return "#3b82f6";
  if (status === "booked") return "#3b82f6";
  if (status === "declined") return "#6b7280";
  return "#6b7280";
}

function getGigDatePart(gig) {
  return String(gig?.date || "").slice(0, 10);
}

function getGigStart(gig) {
  const datePart = getGigDatePart(gig);
  const startTime = gig?.time?.[0] || "00:00";
  return `${datePart}T${startTime}`;
}

function getGigEnd(gig) {
  const datePart = getGigDatePart(gig);
  const endTime = gig?.time?.[1] || gig?.time?.[0] || "23:59";
  return `${datePart}T${endTime}`;
}
