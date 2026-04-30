import { useMemo, useState } from "react";
import "./AvailabilityCalendar.css";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function getDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

export default function AvailabilityCalendar() {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );

  function moveMonth(step) {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + step, 1),
    );
  }

  function toggleDate(date) {
    const dateKey = getDateKey(date);
    setAvailabilitySlots((currentSlots) =>
      currentSlots.some((slot) => slot.date === dateKey)
        ? currentSlots.filter((slot) => slot.date !== dateKey)
        : [
            ...currentSlots,
            {
              date: dateKey,
              startTime: "18:00",
              endTime: "22:00",
            },
          ].sort((firstSlot, secondSlot) =>
            firstSlot.date.localeCompare(secondSlot.date),
          ),
    );
  }

  function updateSlotTime(dateKey, field, value) {
    setAvailabilitySlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.date === dateKey ? { ...slot, [field]: value } : slot,
      ),
    );
  }

  return (
    <div className="availability-shell">
      <section className="availability-card">
        <div className="availability-copy">
          <p className="availability-eyebrow">Booking Calendar</p>
          <h2>Set Your Availability</h2>
          <p>
            Pick the days your band can play. Selected dates are highlighted so
            venues can quickly see when you are ready to gig.
          </p>
        </div>

        <div className="availability-calendar">
          <div className="availability-calendar-header">
            <button type="button" onClick={() => moveMonth(-1)}>
              Previous
            </button>
            <h3>{MONTH_FORMATTER.format(visibleMonth)}</h3>
            <button type="button" onClick={() => moveMonth(1)}>
              Next
            </button>
          </div>

          <div className="availability-weekdays">
            {WEEK_DAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="availability-grid">
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <span
                    aria-hidden="true"
                    className="availability-empty-day"
                    key={`empty-${index}`}
                  />
                );
              }

              const dateKey = getDateKey(date);
              const slot = availabilitySlots.find(
                (availabilitySlot) => availabilitySlot.date === dateKey,
              );

              return (
                <button
                  type="button"
                  key={dateKey}
                  className={slot ? "availability-day selected" : "availability-day"}
                  onClick={() => toggleDate(date)}
                >
                  <span>{date.getDate()}</span>
                  {slot && (
                    <small>
                      {slot.startTime} - {slot.endTime}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="availability-summary">
        <h3>Selected Times</h3>
        {availabilitySlots.length === 0 ? (
          <p>No dates selected yet.</p>
        ) : (
          <div className="availability-slot-list">
            {availabilitySlots.map((slot) => (
              <div className="availability-slot" key={slot.date}>
                <strong>
                  {DISPLAY_DATE_FORMATTER.format(
                    new Date(`${slot.date}T12:00:00`),
                  )}
                </strong>

                <label>
                  Start
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(event) =>
                      updateSlotTime(slot.date, "startTime", event.target.value)
                    }
                  />
                </label>

                <label>
                  End
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(event) =>
                      updateSlotTime(slot.date, "endTime", event.target.value)
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
