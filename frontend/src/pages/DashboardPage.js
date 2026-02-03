import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Clock, 
  Users, 
  ArrowRight, 
  Filter,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = ["All", "Crypto", "Politics", "Tech", "Sports", "Other"];

const getCategoryStyles = (category) => {
  const styles = {
    Crypto: "bg-amber-50 text-amber-700 border-amber-200",
    Politics: "bg-red-50 text-red-700 border-red-200",
    Tech: "bg-blue-50 text-blue-700 border-blue-200",
    Sports: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Other: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return styles[category] || styles.Other;
};

const getStatusBadge = (status, outcome) => {
  if (status === "resolved") {
    return outcome ? (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        YES
      </Badge>
    ) : (
      <Badge className="bg-red-50 text-red-700 border border-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        NO
      </Badge>
    );
  }
  if (status === "closed") {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Closed
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
      <Clock className="h-3 w-3 mr-1" />
      Open
    </Badge>
  );
};

const DashboardPage = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchQuestions = useCallback(async () => {
    try {
      let url = `${API}/questions`;
      const params = new URLSearchParams();
      
      if (categoryFilter !== "All") {
        params.append("category", categoryFilter);
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const openQuestions = questions.filter(q => q.status === "open");
  const resolvedQuestions = questions.filter(q => q.status === "resolved");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-slate-900">
              Prediction Questions
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {openQuestions.length} open · {resolvedQuestions.length} resolved
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]" data-testid="category-filter">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]" data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Questions Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-slate-200 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-full mb-4" />
                  <div className="h-8 bg-slate-200 rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading font-medium text-slate-900 mb-2">
                No questions found
              </h3>
              <p className="text-sm text-slate-500">
                {categoryFilter !== "All" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Check back later for new prediction questions"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {questions.map((question) => {
              const closingDate = new Date(question.closing_date);
              const isClosed = isPast(closingDate) || question.status !== "open";
              
              return (
                <Link 
                  key={question.question_id} 
                  to={`/questions/${question.question_id}`}
                  data-testid={`question-card-${question.question_id}`}
                >
                  <Card className="border-slate-200 h-full hover:border-blue-300 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      {/* Top Row: Category & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge 
                          variant="outline" 
                          className={`${getCategoryStyles(question.category)} text-xs`}
                        >
                          {question.category}
                        </Badge>
                        {getStatusBadge(question.status, question.outcome)}
                      </div>

                      {/* Title */}
                      <h3 className="font-heading font-semibold text-slate-900 mb-2 line-clamp-2">
                        {question.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                        {question.description}
                      </p>

                      {/* Bottom Row: Deadline & Predictions */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {isClosed ? (
                            <span>Closed {format(closingDate, "MMM d")}</span>
                          ) : (
                            <span>{formatDistanceToNow(closingDate, { addSuffix: true })}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <Users className="h-3.5 w-3.5" />
                          <span>{question.prediction_count || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
