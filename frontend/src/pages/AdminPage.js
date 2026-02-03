import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Users,
  FileQuestion,
  Calendar as CalendarIcon,
  Loader2,
  Shield,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = ["Crypto", "Politics", "Tech", "Sports", "Other"];

const AdminPage = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [questionsRes, usersRes] = await Promise.all([
        fetch(`${API}/questions`, { credentials: "include" }),
        fetch(`${API}/users`, { credentials: "include" })
      ]);

      if (questionsRes.ok) {
        setQuestions(await questionsRes.json());
      }
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-slate-900">
              Admin Panel
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage questions, resolutions, and users
            </p>
          </div>
          <CreateQuestionDialog 
            open={createDialogOpen} 
            onOpenChange={setCreateDialogOpen}
            onSuccess={fetchData}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="questions" className="w-full">
          <TabsList>
            <TabsTrigger value="questions" data-testid="admin-tab-questions">
              <FileQuestion className="h-4 w-4 mr-2" />
              Questions ({questions.length})
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="admin-tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users ({users.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="mt-6">
            <QuestionsManagement 
              questions={questions} 
              onUpdate={fetchData} 
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UsersManagement 
              users={users} 
              currentUserId={user?.user_id}
              onUpdate={fetchData}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// Date Picker Field with auto-close
const DatePickerField = ({ closingDate, setClosingDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSelect = (date) => {
    setClosingDate(date);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>Closing Date *</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !closingDate && "text-muted-foreground"
            )}
            data-testid="question-date-picker"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {closingDate ? format(closingDate, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={closingDate}
            onSelect={handleSelect}
            disabled={(date) => date < new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Create Question Dialog
const CreateQuestionDialog = ({ open, onOpenChange, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [closingDate, setClosingDate] = useState(null);
  const [resolutionSource, setResolutionSource] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !description || !category || !closingDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          category,
          closing_date: closingDate.toISOString(),
          resolution_source: resolutionSource
        })
      });

      if (response.ok) {
        toast.success("Question created successfully!");
        onOpenChange(false);
        onSuccess();
        // Reset form
        setTitle("");
        setDescription("");
        setCategory("");
        setClosingDate(null);
        setResolutionSource("");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to create question");
      }
    } catch (error) {
      toast.error("Failed to create question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-900 hover:bg-blue-800" data-testid="create-question-btn">
          <Plus className="h-4 w-4 mr-2" />
          Create Question
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading">Create New Question</DialogTitle>
            <DialogDescription>
              Add a new prediction question for users to forecast.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Will Bitcoin reach $100k by end of 2024?"
                data-testid="question-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the exact conditions for YES/NO resolution..."
                rows={3}
                data-testid="question-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="question-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DatePickerField 
                closingDate={closingDate} 
                setClosingDate={setClosingDate} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Resolution Source</Label>
              <Input
                id="source"
                value={resolutionSource}
                onChange={(e) => setResolutionSource(e.target.value)}
                placeholder="CoinGecko, Official announcement, etc."
                data-testid="question-source-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-900 hover:bg-blue-800"
              disabled={submitting}
              data-testid="submit-question-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Question"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Questions Management
const QuestionsManagement = ({ questions, onUpdate, loading }) => {
  const [resolving, setResolving] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleResolve = async (questionId, outcome) => {
    setResolving(questionId);
    try {
      const response = await fetch(`${API}/questions/${questionId}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ outcome })
      });

      if (response.ok) {
        toast.success(`Question resolved as ${outcome ? "YES" : "NO"}`);
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to resolve question");
      }
    } catch (error) {
      toast.error("Failed to resolve question");
    } finally {
      setResolving(null);
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    
    setDeleting(questionId);
    try {
      const response = await fetch(`${API}/questions/${questionId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Question deleted");
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to delete question");
      }
    } catch (error) {
      toast.error("Failed to delete question");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-200 animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const openQuestions = questions.filter(q => q.status === "open");
  const resolvedQuestions = questions.filter(q => q.status === "resolved");

  return (
    <div className="space-y-6">
      {/* Open Questions */}
      <div>
        <h3 className="font-heading font-medium text-slate-900 mb-3">
          Open Questions ({openQuestions.length})
        </h3>
        {openQuestions.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center">
              <FileQuestion className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No open questions</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {openQuestions.map((q) => (
              <Card key={q.question_id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 mb-1">{q.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="outline" className="text-xs">{q.category}</Badge>
                        <span>·</span>
                        <span>{q.prediction_count || 0} predictions</span>
                        <span>·</span>
                        <span>Closes {format(new Date(q.closing_date), "MMM d")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleResolve(q.question_id, true)}
                        disabled={resolving === q.question_id}
                        data-testid={`resolve-yes-${q.question_id}`}
                      >
                        {resolving === q.question_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            YES
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleResolve(q.question_id, false)}
                        disabled={resolving === q.question_id}
                        data-testid={`resolve-no-${q.question_id}`}
                      >
                        {resolving === q.question_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            NO
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => handleDelete(q.question_id)}
                        disabled={deleting === q.question_id}
                        data-testid={`delete-${q.question_id}`}
                      >
                        {deleting === q.question_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Questions */}
      <div>
        <h3 className="font-heading font-medium text-slate-900 mb-3">
          Resolved Questions ({resolvedQuestions.length})
        </h3>
        {resolvedQuestions.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No resolved questions yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {resolvedQuestions.map((q) => (
              <Card key={q.question_id} className="border-slate-200 bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-700 mb-1">{q.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="outline" className="text-xs">{q.category}</Badge>
                        <span>·</span>
                        <span>{q.prediction_count || 0} predictions</span>
                      </div>
                    </div>
                    {q.outcome ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        YES
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        NO
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Users Management
const UsersManagement = ({ users, currentUserId, onUpdate, loading }) => {
  const [updating, setUpdating] = useState(null);

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId);
    try {
      const response = await fetch(`${API}/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        toast.success(`User role updated to ${newRole}`);
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-200 animate-pulse">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((u) => {
        const isCurrentUser = u.user_id === currentUserId;
        return (
          <Card key={u.user_id} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.picture} alt={u.name} />
                    <AvatarFallback className="bg-slate-100 text-slate-600">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-900">
                      {u.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-blue-600">(You)</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <p className="font-mono text-slate-900">
                      {u.accuracy_score?.toFixed(1) || 0}%
                    </p>
                    <p className="text-slate-500">{u.total_predictions} pred.</p>
                  </div>
                  {isCurrentUser ? (
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  ) : (
                    <Select
                      value={u.role}
                      onValueChange={(value) => handleRoleChange(u.user_id, value)}
                      disabled={updating === u.user_id}
                    >
                      <SelectTrigger className="w-28" data-testid={`role-select-${u.user_id}`}>
                        {updating === u.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center">
                            <Shield className="h-3 w-3 mr-2 text-slate-400" />
                            User
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center">
                            <ShieldCheck className="h-3 w-3 mr-2 text-blue-600" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminPage;
