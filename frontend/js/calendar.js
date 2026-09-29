// ==========================================================================
// CALENDAR CONTROLLER
// Visual Milestone Tracking, Sprint Deadlines & Defect Target Dates
// ==========================================================================

class CalendarController {
  constructor() {
    this.currentDate = new Date();
  }

  async loadCalendar() {
    try {
      const defects = await api.getDefects();
      const sprints = await api.getSprints();
      this.renderCalendarGrid(defects, sprints);
    } catch (err) {
      console.error("Calendar load error:", err);
    }
  }

  renderCalendarGrid(defects, sprints) {
    const container = document.getElementById('calendar-grid');
    const monthTitle = document.getElementById('calendar-month-title');
    if (!container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    if (monthTitle) monthTitle.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let gridHtml = '';

    // Day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    gridHtml += `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 8px; text-align: center; font-weight: 600; font-size: 0.8rem; color: var(--text-muted);">
      ${days.map(d => `<div>${d}</div>`).join('')}
    </div>`;

    // Days grid
    gridHtml += `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">`;

    // Empty cells before start of month
    for (let i = 0; i < firstDay; i++) {
      gridHtml += `<div style="background: rgba(255,255,255,0.01); border-radius: var(--radius-sm); min-height: 90px; border: 1px dashed rgba(255,255,255,0.04);"></div>`;
    }

    const todayDate = new Date().getDate();
    const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year;

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === todayDate;
      
      // Events on this day
      const dayDefects = defects.filter(d => {
        if (!d.due_date) return false;
        const dDate = new Date(d.due_date);
        return dDate.getDate() === day && dDate.getMonth() === month;
      });

      const daySprints = sprints.filter(s => {
        const sEnd = new Date(s.end_date);
        return sEnd.getDate() === day && sEnd.getMonth() === month;
      });

      let eventsHtml = '';
      daySprints.forEach(s => {
        eventsHtml += `
          <div style="background: rgba(99, 102, 241, 0.25); color: #c7d2fe; border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; font-weight: 600; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            🏁 ${s.name} Ends
          </div>
        `;
      });

      dayDefects.forEach(d => {
        const isCrit = d.severity === 'Critical';
        eventsHtml += `
          <div style="background: ${isCrit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'}; color: ${isCrit ? '#f87171' : '#facc15'}; border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; font-weight: 600; margin-top: 4px; cursor: pointer;" onclick="defectsController.openDetailsModal(${d.id})">
            🐞 ${d.key} Due
          </div>
        `;
      });

      gridHtml += `
        <div style="background: ${isToday ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)'}; border: 1px solid ${isToday ? 'var(--accent-primary)' : 'var(--border-color)'}; border-radius: var(--radius-sm); padding: 8px; min-height: 100px; display: flex; flex-direction: column;">
          <span style="font-size: 0.85rem; font-weight: ${isToday ? '700' : '500'}; color: ${isToday ? 'var(--accent-primary)' : 'inherit'};">
            ${day} ${isToday ? '(Today)' : ''}
          </span>
          <div style="flex: 1; overflow-y: auto;">
            ${eventsHtml}
          </div>
        </div>
      `;
    }

    gridHtml += `</div>`;
    container.innerHTML = gridHtml;
  }
}

window.calendarController = new CalendarController();
