import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [userData, setUserData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    jobTitle: user?.jobTitle || "",
    department: user?.department || "",
    bio: user?.bio || "",
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async (data: typeof userData) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate(userData);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Settings navigation */}
            <div className="md:col-span-1 space-y-1">
              <Button variant="default" className="w-full justify-start">Profile</Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-100">Notifications</Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-100">Security</Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-100">Integrations</Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-100">Billing</Button>
            </div>
            
            {/* Settings content */}
            <div className="md:col-span-3">
              <h3 className="font-semibold text-lg mb-6">Profile Settings</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center">
                  <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl mr-6">
                    {userData.firstName && userData.lastName 
                      ? `${userData.firstName[0]}${userData.lastName[0]}`
                      : user?.username?.[0]?.toUpperCase() || "U"}
                  </div>
                  
                  <div>
                    <Button type="button" className="bg-primary hover:bg-secondary text-white rounded-lg">
                      Upload Photo
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">JPG, GIF or PNG. Max size 2MB</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={userData.firstName}
                      onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={userData.lastName}
                      onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={userData.jobTitle}
                      onChange={(e) => setUserData({ ...userData, jobTitle: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={userData.department}
                      onChange={(e) => setUserData({ ...userData, department: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    value={userData.bio}
                    onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                    placeholder="Tell us about yourself"
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-secondary text-white"
                    disabled={updateUser.isPending}
                  >
                    {updateUser.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
