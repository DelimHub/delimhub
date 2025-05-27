import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Event, Project } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus, Users, Calendar as CalendarIcon, MapPin, Video } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

export default function Calendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    start: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
    end: format(new Date(selectedDate.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"), // 1 hour later
    location: "",
    projectId: "",
  });

  // Fetch events
  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch projects for event creation
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create event mutation
  const createEvent = useMutation({
    mutationFn: async (eventData: typeof newEvent) => {
      const data = {
        ...eventData,
        projectId: eventData.projectId ? parseInt(eventData.projectId) : null,
      };
      const response = await apiRequest("POST", "/api/events", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsEventModalOpen(false);
      toast({
        title: "Success",
        description: "Event created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent.mutate(newEvent);
  };

  // Calendar navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Event helpers
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      return isSameDay(eventStart, date);
    });
  };

  // Handle date selection
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setNewEvent({
      ...newEvent,
      start: format(date, "yyyy-MM-dd'T'HH:mm"),
      end: format(new Date(date.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    });
  };

  // Get upcoming events (sorted by start date)
  const upcomingEvents = [...events]
    .filter(event => new Date(event.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 4);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Calendar</h2>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={goToToday}
            className="bg-white border border-gray-300 rounded-lg text-sm font-medium"
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            onClick={prevMonth}
            className="bg-white border border-gray-300 rounded-lg flex items-center text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={nextMonth}
            className="bg-white border border-gray-300 rounded-lg flex items-center text-sm font-medium"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setIsEventModalOpen(true)} 
            className="bg-primary hover:bg-secondary text-white rounded-lg flex items-center text-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-1" /> Event
          </Button>
        </div>
      </div>
      
      {/* Calendar Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-4">{format(currentMonth, "MMMM yyyy")}</h3>
          
          {/* Calendar grid header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            <div className="text-center font-medium text-gray-500">Sun</div>
            <div className="text-center font-medium text-gray-500">Mon</div>
            <div className="text-center font-medium text-gray-500">Tue</div>
            <div className="text-center font-medium text-gray-500">Wed</div>
            <div className="text-center font-medium text-gray-500">Thu</div>
            <div className="text-center font-medium text-gray-500">Fri</div>
            <div className="text-center font-medium text-gray-500">Sat</div>
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              
              return (
                <div
                  key={i}
                  onClick={() => handleDateClick(day)}
                  className={`h-24 p-1 border ${isSelected ? 'border-2 border-primary' : 'border-gray-200'} 
                    rounded ${isCurrentMonth ? '' : 'bg-gray-50'} 
                    ${isToday ? 'bg-primary bg-opacity-5' : ''} 
                    cursor-pointer hover:bg-gray-50 transition-colors`}
                >
                  <span className={`text-sm ${isToday ? 'font-bold' : ''} ${isCurrentMonth ? '' : 'text-gray-400'}`}>
                    {format(day, "d")}
                  </span>
                  
                  {dayEvents.slice(0, 2).map((event, j) => (
                    <div 
                      key={j} 
                      className="mt-1 px-1 py-0.5 text-xs bg-primary text-white rounded truncate"
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  
                  {dayEvents.length > 2 && (
                    <div className="mt-1 px-1 py-0.5 text-xs text-gray-500">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Upcoming Events */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Upcoming Events</h3>
          
          <div className="space-y-4">
            {eventsLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-start">
                    <div className="h-12 w-12 rounded-lg bg-gray-200 mr-4"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              upcomingEvents.map(event => (
                <div key={event.id} className="flex items-start">
                  <div className="h-12 w-12 rounded-lg bg-primary bg-opacity-10 flex items-center justify-center mr-4 flex-shrink-0">
                    <CalendarIcon className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">{event.title}</h4>
                    <p className="text-sm text-gray-600">
                      {format(new Date(event.start), "MMM d, yyyy, h:mm a")} - 
                      {format(new Date(event.end), " h:mm a")}
                    </p>
                    {event.location && (
                      <div className="flex items-center mt-1">
                        <MapPin className="text-gray-400 h-3 w-3 mr-1" />
                        <span className="text-xs text-gray-500">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No upcoming events</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Create Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateEvent}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="eventTitle">Event Title</Label>
                <Input
                  id="eventTitle"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Enter event title"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="eventDescription">Description</Label>
                <Textarea
                  id="eventDescription"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Enter event description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="eventStart">Start Time</Label>
                  <Input
                    id="eventStart"
                    type="datetime-local"
                    value={newEvent.start}
                    onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="eventEnd">End Time</Label>
                  <Input
                    id="eventEnd"
                    type="datetime-local"
                    value={newEvent.end}
                    onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="eventLocation">Location</Label>
                <Input
                  id="eventLocation"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Enter location (optional)"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="eventProject">Project</Label>
                <Select
                  value={newEvent.projectId}
                  onValueChange={(value) => setNewEvent({ ...newEvent, projectId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEventModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-secondary text-white"
                disabled={createEvent.isPending}
              >
                {createEvent.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
