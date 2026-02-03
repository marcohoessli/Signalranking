import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getRankIcon = (rank) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return null;
};

const getRankBg = (rank) => {
  if (rank === 1) return "bg-amber-50 border-amber-200";
  if (rank === 2) return "bg-slate-50 border-slate-200";
  if (rank === 3) return "bg-orange-50 border-orange-200";
  return "border-slate-200";
};

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${API}/leaderboard?min_predictions=1`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  // Find current user's rank
  const myRank = leaderboard.find(entry => entry.user_id === user?.user_id);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Leaderboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Top forecasters ranked by accuracy (minimum 1 resolved prediction)
          </p>
        </div>

        {/* My Rank Card (if ranked) */}
        {myRank && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 font-mono font-semibold text-blue-900">
                    #{myRank.rank}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Your Ranking</p>
                    <p className="text-sm text-slate-600">
                      {myRank.total_predictions} predictions · {myRank.accuracy_score.toFixed(1)}% accuracy
                    </p>
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard List */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Global Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                    <div className="w-8 h-8 bg-slate-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/4" />
                    </div>
                    <div className="h-6 bg-slate-200 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-heading font-medium text-slate-900 mb-2">
                  No rankings yet
                </h3>
                <p className="text-sm text-slate-500">
                  Be the first to make predictions and get ranked!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {leaderboard.map((entry) => {
                  const isMe = entry.user_id === user?.user_id;
                  return (
                    <Link
                      key={entry.user_id}
                      to={`/profile/${entry.user_id}`}
                      className={`flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors ${
                        isMe ? "bg-blue-50/50" : ""
                      }`}
                      data-testid={`leaderboard-entry-${entry.rank}`}
                    >
                      {/* Rank */}
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${getRankBg(entry.rank)}`}>
                        {getRankIcon(entry.rank) || (
                          <span className="font-mono text-sm font-semibold text-slate-600">
                            {entry.rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar & Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={entry.picture} alt={entry.name} />
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-sm">
                            {getInitials(entry.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {entry.name}
                            {isMe && (
                              <span className="ml-2 text-xs text-blue-600">(You)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {entry.total_predictions} predictions
                          </p>
                        </div>
                      </div>

                      {/* Accuracy */}
                      <div className="text-right">
                        <p className={`font-mono text-lg font-semibold ${
                          entry.accuracy_score >= 70 ? "text-emerald-600" :
                          entry.accuracy_score >= 50 ? "text-amber-600" : "text-slate-600"
                        }`}>
                          {entry.accuracy_score.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">accuracy</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="p-4 bg-slate-100 rounded-lg">
          <p className="text-sm text-slate-600">
            <strong>How scoring works:</strong> We use the Brier Score to measure prediction accuracy. 
            Lower Brier scores mean better predictions. Accuracy is calculated as (1 - average Brier score) × 100.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LeaderboardPage;
