import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCalendarStore } from '@/features/calendar/useCalendarStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useNotificationStore } from '@/features/notifications/useNotificationStore';
import { CalendarEventInputSchema, type CalendarEventInput, type CalendarEvent } from '@/types/database';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  Trash2, Clock, X, AlertCircle, CheckCircle, Loader2, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useDocumentMetadata } from '@/hooks/useDocumentMetadata';

export const Calendar: React.FC = () => {
  useDocumentMetadata('Academic Calendar', 'Track exams, lectures, assignments, and class holidays on the ClassNotes academic calendar.');
  const { user } = useAuthStore();
  const { 
    events, fetchEvents, createEvent, deleteEvent, typeFilter, setTypeFilter, isLoading 
  } = useCalendarStore();
  const { addNotification } = useNotificationStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );
  
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const showToast = (text: string, type: 'error' | 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CalendarEventInput>({
    resolver: zodResolver(CalendarEventInputSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      type: 'lecture',
      courseName: '',
    }
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const onAddEventSubmit = async (data: CalendarEventInput) => {
    if (!user) return;
    setFormError(null);
    try {
      await createEvent(data);
      
      // Dispatch notification
      addNotification(
        'Calendar Event Added',
        `New academic event published: "${data.title}" on ${data.date}`,
        'announcement'
      );

      setAddSuccess(true);
      reset();
      
      showToast('Event published successfully', 'success');
      setTimeout(() => {
        setIsAddEventOpen(false);
        setAddSuccess(false);
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add event. Please try again.');
    }
  };

  const handleDeleteEvent = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const executeDeleteEvent = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteEvent(id);
      showToast('Event deleted successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete event', 'error');
    }
  };

  // Generate calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0

  const calendarDays: (number | null)[] = [];
  // Padding for prev month days
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getEventBadgeColor = (type: CalendarEvent['type']) => {
    if (type === 'exam') return 'bg-danger text-danger border-danger/25';
    if (type === 'assignment') return 'bg-warning text-warning border-warning/25';
    if (type === 'lecture') return 'bg-accent text-accent border-accent/25';
    return 'bg-success text-success border-success/25'; // holiday
  };

  const getEventDotColor = (type: CalendarEvent['type']) => {
    if (type === 'exam') return 'bg-danger';
    if (type === 'assignment') return 'bg-warning';
    if (type === 'lecture') return 'bg-accent';
    return 'bg-success';
  };

  // Filter events by month date or type
  const eventsInActiveMonth = events.filter((e) => {
    const eventDate = new Date(e.date);
    return eventDate.getFullYear() === year && eventDate.getMonth() === month;
  });

  const filteredEvents = eventsInActiveMonth.filter((e) => {
    const matchesType = typeFilter === '' || e.type === typeFilter;
    const matchesSelectedDate = selectedDate === null || e.date === selectedDate;
    return matchesType && matchesSelectedDate;
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      {/* Toast Feedback popup */}
      <div className="fixed top-20 right-6 z-50 pointer-events-none select-none max-w-sm w-full">
        {toastMessage && (
          <div className={`p-4 rounded-md shadow-lg border flex items-start gap-2.5 bg-surface text-xs font-medium animate-slide-in pointer-events-auto ${
            toastMessage.type === 'error' 
              ? 'border-danger/30 text-danger' 
              : 'border-success/30 text-success'
          }`}>
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{toastMessage.text}</span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">Schedules</span>
          <h1 className="text-3xl font-bold mt-1 tracking-tight">Academic Calendar</h1>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddEventOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-surface font-semibold px-4 py-2.5 rounded-md text-xs shadow-sm active-scale transition-all select-none cursor-pointer"
          >
            <Plus size={14} />
            Add Event
          </button>
        )}
      </div>

      {/* Calendar Grid & List Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Cols: Monthly grid calendar */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card p-6">
            {/* Header controls for Calendar navigation */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
              <h2 className="font-extrabold text-sm font-mono uppercase tracking-wide">
                {monthNames[month]} {year}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 border border-border/60 hover:bg-background rounded-md text-primary/75 hover:text-primary transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 border border-border/60 hover:bg-background rounded-md text-primary/75 hover:text-primary transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Calendar grid grid columns */}
            <div className="grid grid-cols-7 gap-px bg-border/40 border border-border/80 rounded-md overflow-hidden text-center text-[10px] font-mono uppercase font-bold text-primary/50">
              <div className="py-2.5 bg-background/50">Sun</div>
              <div className="py-2.5 bg-background/50">Mon</div>
              <div className="py-2.5 bg-background/50">Tue</div>
              <div className="py-2.5 bg-background/50">Wed</div>
              <div className="py-2.5 bg-background/50">Thu</div>
              <div className="py-2.5 bg-background/50">Fri</div>
              <div className="py-2.5 bg-background/50">Sat</div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-7 gap-px bg-border/40 border border-t-0 border-border/80 rounded-b-md overflow-hidden animate-pulse">
                {[...Array(35)].map((_, idx) => (
                  <div key={idx} className="bg-surface/60 min-h-[75px] p-2 flex flex-col justify-between" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border/40 border border-t-0 border-border/80 rounded-b-md overflow-hidden">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="bg-background/20 min-h-[75px]" />;
                  }

                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;
                  
                  // Get events for this cell date
                  const dayEvents = eventsInActiveMonth.filter(e => e.date === dateStr);

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`bg-surface min-h-[75px] p-2 flex flex-col justify-between cursor-pointer transition-all hover:bg-primary/[0.01] text-xs font-mono relative ${
                        isSelected ? 'ring-2 ring-inset ring-accent bg-accent/[0.01]' : ''
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                        isToday 
                          ? 'bg-primary text-white' 
                          : isSelected 
                            ? 'text-accent' 
                            : 'text-primary/70'
                      }`}>
                        {day}
                      </span>

                      {/* Cell Dots indicators */}
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {dayEvents.slice(0, 3).map((e) => (
                            <span
                              key={e.id}
                              className={`w-1.5 h-1.5 rounded-full ${getEventDotColor(e.type)}`}
                              title={e.title}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[7px] font-mono text-primary/45 font-bold leading-none self-center">
                              +{dayEvents.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Timeline & Filters list */}
        <div className="space-y-6">
          {/* Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="premium-card p-4 space-y-3"
          >
            <div className="flex items-center gap-2 border-b border-border/40 pb-2.5 text-[9px] font-mono font-bold uppercase text-primary/45 tracking-wider">
              <Filter size={11} className="text-accent" />
              <span>Filter Calendar</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold">
              <button
                onClick={() => setTypeFilter('')}
                className={`py-1.5 border px-2.5 rounded transition-all cursor-pointer active-scale uppercase tracking-wider ${
                  typeFilter === '' 
                    ? 'bg-accent text-white border-accent shadow-sm' 
                    : 'border-border/60 hover:bg-background text-primary/75'
                }`}
              >
                ALL EVENTS
              </button>
              <button
                onClick={() => setTypeFilter('exam')}
                className={`py-1.5 border px-2.5 rounded transition-all cursor-pointer active-scale uppercase tracking-wider ${
                  typeFilter === 'exam' 
                    ? 'bg-danger text-white border-danger shadow-sm' 
                    : 'border-border/60 hover:bg-background text-primary/75'
                }`}
              >
                EXAMS
              </button>
              <button
                onClick={() => setTypeFilter('assignment')}
                className={`py-1.5 border px-2.5 rounded transition-all cursor-pointer active-scale uppercase tracking-wider ${
                  typeFilter === 'assignment' 
                    ? 'bg-warning text-white border-warning shadow-sm' 
                    : 'border-border/60 hover:bg-background text-primary/75'
                }`}
              >
                ASSIGNMENTS
              </button>
              <button
                onClick={() => setTypeFilter('lecture')}
                className={`py-1.5 border px-2.5 rounded transition-all cursor-pointer active-scale uppercase tracking-wider ${
                  typeFilter === 'lecture' 
                    ? 'bg-accent text-white border-accent shadow-sm' 
                    : 'border-border/60 hover:bg-background text-primary/75'
                }`}
              >
                LECTURES
              </button>
            </div>
          </motion.div>

          {/* Selected Date timeline list */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="premium-card p-5 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
              <span className="text-[9px] font-mono uppercase text-primary/45 font-bold tracking-wider">
                {selectedDate ? `Events for ${selectedDate}` : 'Select a date'}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[9px] font-mono text-accent hover:underline cursor-pointer font-bold"
              >
                Show all month
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {filteredEvents.length === 0 ? (
                <div className="py-8 text-center text-primary/40 font-mono text-[9px] uppercase tracking-wider flex flex-col items-center justify-center gap-2">
                  <CalendarIcon size={14} className="text-primary/20" />
                  <span>No events listed</span>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border-l-2 border-border/70 pl-3.5 py-1 space-y-1.5 relative group"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-0.5">
                        <span className={`inline-block text-[8px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${getEventBadgeColor(event.type)}`}>
                          {event.type}
                        </span>
                        <h4 className="text-xs font-bold text-primary tracking-tight leading-tight group-hover:text-accent transition-colors break-words mt-1">
                          {event.title}
                        </h4>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteEvent(event.id, event.title)}
                          className="p-1 border border-border/60 text-primary/40 hover:text-danger hover:bg-danger/5 hover:border-danger/25 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 active-scale"
                          title="Delete event"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-primary/65 font-sans leading-normal">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-primary/40 uppercase font-bold">
                      <Clock size={9} />
                      <span>{event.courseName} • {event.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Admin Add Event modal panel */}
      <AnimatePresence>
        {isAddEventOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting) setIsAddEventOpen(false);
              }}
              className="fixed inset-0 bg-primary/45 backdrop-blur-xs"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-surface border border-border w-full max-w-md rounded-lg shadow-luxury flex flex-col relative z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-border px-5 py-4 flex items-center justify-between bg-surface shrink-0">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-accent font-semibold">Console Control</span>
                  <h2 className="font-bold text-base text-primary">Schedule Academic Event</h2>
                </div>
                <button
                  onClick={() => setIsAddEventOpen(false)}
                  disabled={isSubmitting}
                  className="p-1 border border-border hover:bg-background text-primary/70 hover:text-primary rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Close modal"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Form body */}
              <div className="p-5">
                {addSuccess ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center gap-4 animate-scale-in">
                    <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center border border-success/20">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-primary">Event Scheduled!</h3>
                      <p className="text-xs text-primary/45 mt-1 font-mono">Adding event node to calendar.</p>
                    </div>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit(onAddEventSubmit)}>
                    {formError && (
                      <div className="p-3 bg-danger/5 border border-danger/25 text-danger rounded-md text-xs flex items-start gap-2">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Event Title */}
                    <div className="space-y-1">
                      <label htmlFor="title" className="block text-[10px] font-mono uppercase tracking-wider text-primary/75">
                        Event Title
                      </label>
                      <input
                        id="title"
                        type="text"
                        placeholder="e.g. Guest Seminar: Transformers"
                        disabled={isSubmitting}
                        {...register('title')}
                        className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all ${
                          errors.title ? 'border-danger focus:ring-danger/20' : 'border-border'
                        }`}
                      />
                      {errors.title && (
                        <p className="text-[11px] text-danger flex items-center gap-1 mt-0.5">
                          <AlertCircle size={12} />
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label htmlFor="description" className="block text-[10px] font-mono uppercase tracking-wider text-primary/75">
                        Description
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        placeholder="Topics covered, room coordinates, guidelines..."
                        disabled={isSubmitting}
                        {...register('description')}
                        className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all resize-none ${
                          errors.description ? 'border-danger focus:ring-danger/20' : 'border-border'
                        }`}
                      />
                      {errors.description && (
                        <p className="text-[11px] text-danger flex items-center gap-1 mt-0.5">
                          <AlertCircle size={12} />
                          {errors.description.message}
                        </p>
                      )}
                    </div>

                    {/* Date & CourseName grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="date" className="block text-[10px] font-mono uppercase tracking-wider text-primary/75">
                          Event Date
                        </label>
                        <input
                          id="date"
                          type="date"
                          disabled={isSubmitting}
                          {...register('date')}
                          className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all ${
                            errors.date ? 'border-danger focus:ring-danger/20' : 'border-border'
                          }`}
                        />
                        {errors.date && (
                          <p className="text-[11px] text-danger flex items-center gap-1 mt-0.5">
                            <AlertCircle size={12} />
                            {errors.date.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="courseName" className="block text-[10px] font-mono uppercase tracking-wider text-primary/75">
                          Subject / Course
                        </label>
                        <input
                          id="courseName"
                          type="text"
                          placeholder="e.g. AI Systems"
                          disabled={isSubmitting}
                          {...register('courseName')}
                          className={`block w-full rounded-md border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent transition-all ${
                            errors.courseName ? 'border-danger focus:ring-danger/20' : 'border-border'
                          }`}
                        />
                        {errors.courseName && (
                          <p className="text-[11px] text-danger flex items-center gap-1 mt-0.5">
                            <AlertCircle size={12} />
                            {errors.courseName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Event Type select */}
                    <div className="space-y-1">
                      <label htmlFor="type" className="block text-[10px] font-mono uppercase tracking-wider text-primary/75">
                        Event Category
                      </label>
                      <select
                        id="type"
                        disabled={isSubmitting}
                        {...register('type')}
                        className="block w-full rounded-md border border-border px-3 py-2 text-xs shadow-sm bg-background/50 focus:bg-surface focus:border-accent focus:ring-accent/20 transition-all cursor-pointer text-primary"
                      >
                        <option value="lecture">Lecture (Blue Tag)</option>
                        <option value="exam">Exam (Red Tag)</option>
                        <option value="assignment">Assignment Deadline (Amber Tag)</option>
                        <option value="holiday">Holiday (Green Tag)</option>
                      </select>
                    </div>

                    {/* Submit action */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-surface bg-accent hover:bg-accent/90 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={14} className="animate-spin mr-2" />
                            <span>Creating event...</span>
                          </>
                        ) : (
                          <span>Publish Event</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="fixed inset-0 bg-primary/45 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              className="bg-surface border border-border w-full max-w-md rounded-lg shadow-luxury p-6 relative z-10 flex flex-col gap-4 text-left"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-danger/10 text-danger border border-danger/25 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary">Confirm Deletion</h3>
                  <p className="text-xs text-primary/60 mt-1 leading-relaxed">
                    Are you sure you want to delete event <span className="font-semibold text-primary">"{deleteTarget.title}"</span>? This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 border border-border text-primary/70 hover:text-primary rounded-md text-xs font-semibold hover:bg-primary/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteEvent}
                  className="px-4 py-2 bg-danger text-surface hover:bg-danger/95 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-danger focus:outline-none"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Calendar;
