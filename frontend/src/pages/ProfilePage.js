import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  TrendingUp, 
  Calendar,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

const ProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch profile
      const profileResponse = await fetch(`${API}/users/${userId}/profile`, {
        credentials: "include"
      });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
      }

      // Fetch predictions
      const predictionsResponse = await fetch(`${API}/predictions/user/${userId}`, {
        credentials: "include"
      });
      if (predictionsResponse.ok) {
        const predictionsData = await predictionsResponse.json();
        setPredictions(predictionsData);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="font-heading text-xl font-medium text-slate-900">
            User not found
          </h2>
        </div>
      </DashboardLayout>
    );
  }

  const isOwnProfile = currentUser?.user_id === userId;
  const resolvedPredictions = predictions.filter(p => p.brier_score !== null);
  const pendingPredictions = predictions.filter(p => p.brier_score === null);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.picture} alt={profile.name} />
                <AvatarFallback className="bg-blue-100 text-blue-900 text-2xl font-medium">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-heading text-2xl font-semibold text-slate-900">
                    {profile.name}
                  </h1>
                  {isOwnProfile && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                  {profile.role === "admin" && (
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-slate-500 mb-4">{profile.email}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Joined {format(new Date(profile.created_at), "MMMM yyyy")}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="text-center">
                  <p className={`font-mono text-2xl font-semibold ${
                    profile.accuracy_score >= 70 ? "text-emerald-600" :
                    profile.accuracy_score >= 50 ? "text-amber-600" : "text-slate-600"
                  }`}>
                    {profile.total_predictions > 0 
                      ? `${profile.accuracy_score.toFixed(1)}%`
                      : "N/A"}
                  </p>
                  <p className="text-xs text-slate-500">Accuracy</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-semibold text-slate-900">
                    {profile.total_predictions}
                  </p>
                  <p className="text-xs text-slate-500">Predictions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        {profile.category_stats && Object.keys(profile.category_stats).length > 0 && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-400" />
                Category Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(profile.category_stats).map(([category, stats]) => (
                  <div
                    key={category}
                    className={`p-3 rounded-lg border ${getCategoryStyles(category)}`}
                  >
                    <p className="text-xs font-medium mb-1">{category}</p>
                    <p className="font-mono text-lg font-semibold">
                      {stats.accuracy.toFixed(1)}%
                    </p>
                    <p className="text-xs opacity-75">{stats.count} pred.</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Predictions History */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-400" />
              Prediction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all" data-testid="tab-all">
                  All ({predictions.length})
                </TabsTrigger>
                <TabsTrigger value="resolved" data-testid="tab-resolved">
                  Resolved ({resolvedPredictions.length})
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">
                  Pending ({pendingPredictions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <PredictionList predictions={predictions} />
              </TabsContent>
              <TabsContent value="resolved">
                <PredictionList predictions={resolvedPredictions} />
              </TabsContent>
              <TabsContent value="pending">
                <PredictionList predictions={pendingPredictions} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const PredictionList = ({ predictions }) => {
  if (predictions.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No predictions in this category</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {predictions.map((pred) => {
        const accuracy = pred.brier_score !== null
          ? ((1 - pred.brier_score) * 100).toFixed(1)
          : null;

        return (
          <Link
            key={pred.prediction_id}
            to={`/questions/${pred.question_id}`}
            className="flex items-center justify-between py-3 px-2 -mx-2 rounded hover:bg-slate-50 transition-colors"
            data-testid={`prediction-${pred.prediction_id}`}
          >
            <div className="flex-1 min-w-0 pr-4">
              <p className="font-medium text-slate-900 truncate">
                {pred.question_title || "Question"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {pred.question_category && (
                  <Badge 
                    variant="outline" 
                    className={`${getCategoryStyles(pred.question_category)} text-xs`}
                  >
                    {pred.question_category}
                  </Badge>
                )}
                {pred.question_status === "resolved" ? (
                  pred.question_outcome ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      YES
                    </Badge>
                  ) : (
                    <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      NO
                    </Badge>
                  )
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="font-mono text-sm font-medium text-slate-900">
                {pred.probability.toFixed(0)}%
              </p>
              {accuracy !== null && (
                <p className={`font-mono text-xs ${
                  parseFloat(accuracy) >= 70 ? "text-emerald-600" :
                  parseFloat(accuracy) >= 50 ? "text-amber-600" : "text-red-600"
                }`}>
                  {accuracy}% acc
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default ProfilePage;
