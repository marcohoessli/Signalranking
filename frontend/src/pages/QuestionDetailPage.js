import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Clock, 
  Users, 
  ArrowLeft, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Info
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

const QuestionDetailPage = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [question, setQuestion] = useState(null);
  const [myPrediction, setMyPrediction] = useState(null);
  const [probability, setProbability] = useState(50);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch question
      const qResponse = await fetch(`${API}/questions/${questionId}`, {
        credentials: "include"
      });
      if (!qResponse.ok) {
        toast.error("Question not found");
        navigate("/dashboard");
        return;
      }
      const qData = await qResponse.json();
      setQuestion(qData);

      // Fetch my prediction
      const pResponse = await fetch(`${API}/predictions/my/${questionId}`, {
        credentials: "include"
      });
      if (pResponse.ok) {
        const pData = await pResponse.json();
        if (pData.prediction) {
          setMyPrediction(pData.prediction);
          setProbability(pData.prediction.probability);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load question");
    } finally {
      setLoading(false);
    }
  }, [questionId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API}/predictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question_id: questionId,
          probability: probability
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMyPrediction(data);
        toast.success(myPrediction ? "Prediction updated!" : "Prediction submitted!");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to submit prediction");
      }
    } catch (error) {
      toast.error("Failed to submit prediction");
    } finally {
      setSubmitting(false);
    }
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

  if (!question) {
    return null;
  }

  const closingDate = new Date(question.closing_date);
  const isClosed = isPast(closingDate) || question.status !== "open";
  const isResolved = question.status === "resolved";

  // Calculate Brier score display
  const brierScore = myPrediction?.brier_score;
  const accuracy = brierScore !== null && brierScore !== undefined
    ? ((1 - brierScore) * 100).toFixed(1)
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="text-slate-600 hover:text-slate-900 -ml-2"
          onClick={() => navigate("/dashboard")}
          data-testid="back-btn"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Questions
        </Button>

        {/* Question Card */}
        <Card className="border-slate-200">
          <CardContent className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${getCategoryStyles(question.category)} text-xs`}
                  >
                    {question.category}
                  </Badge>
                  {isResolved ? (
                    question.outcome ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Resolved YES
                      </Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Resolved NO
                      </Badge>
                    )
                  ) : isClosed ? (
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Closed
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Open
                    </Badge>
                  )}
                </div>
                <h1 className="font-heading text-2xl font-semibold text-slate-900">
                  {question.title}
                </h1>
              </div>
            </div>

            {/* Description */}
            <p className="text-slate-600 leading-relaxed">
              {question.description}
            </p>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {isClosed ? (
                  <span>Closed {format(closingDate, "MMM d, yyyy 'at' h:mm a")}</span>
                ) : (
                  <span>Closes {formatDistanceToNow(closingDate, { addSuffix: true })}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{question.prediction_count || 0} predictions</span>
              </div>
            </div>

            {/* Resolution Source */}
            {question.resolution_source && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Resolution Source
                    </p>
                    <p className="text-sm text-slate-700">{question.resolution_source}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prediction Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-lg">Your Prediction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isResolved && myPrediction ? (
              // Show results after resolution
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Your Prediction
                    </p>
                    <p className="font-mono text-2xl font-semibold text-slate-900">
                      {myPrediction.probability.toFixed(0)}%
                    </p>
                    <p className="text-sm text-slate-500">
                      {myPrediction.probability >= 50 ? "YES" : "NO"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Prediction Accuracy
                    </p>
                    <p className={`font-mono text-2xl font-semibold ${
                      parseFloat(accuracy) >= 70 ? "text-emerald-600" : 
                      parseFloat(accuracy) >= 50 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {accuracy}%
                    </p>
                    <p className="text-sm text-slate-500">
                      Brier: {brierScore?.toFixed(3)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    The actual outcome was <strong>{question.outcome ? "YES" : "NO"}</strong>. 
                    Your accuracy score has been updated.
                  </p>
                </div>
              </div>
            ) : isClosed && !myPrediction ? (
              // Closed without prediction
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  This question is closed for predictions.
                </p>
              </div>
            ) : isClosed && myPrediction ? (
              // Closed but awaiting resolution
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Your Prediction
                  </p>
                  <p className="font-mono text-2xl font-semibold text-slate-900">
                    {myPrediction.probability.toFixed(0)}%
                  </p>
                  <p className="text-sm text-slate-500">
                    Submitted {format(new Date(myPrediction.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Waiting for resolution. Your accuracy will be calculated once the outcome is determined.
                  </p>
                </div>
              </div>
            ) : (
              // Open for predictions
              <div className="space-y-6">
                {/* Probability Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">No (0%)</span>
                    <span className="font-mono text-3xl font-semibold text-slate-900">
                      {probability}%
                    </span>
                    <span className="text-sm text-slate-500">Yes (100%)</span>
                  </div>
                  
                  <div className="px-2">
                    <Slider
                      value={[probability]}
                      onValueChange={(value) => setProbability(value[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="cursor-pointer"
                      data-testid="probability-slider"
                    />
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex justify-center gap-2">
                    {[10, 25, 50, 75, 90].map((p) => (
                      <Button
                        key={p}
                        variant="outline"
                        size="sm"
                        className={`font-mono ${probability === p ? "border-blue-500 bg-blue-50" : ""}`}
                        onClick={() => setProbability(p)}
                        data-testid={`quick-select-${p}`}
                      >
                        {p}%
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full bg-blue-900 hover:bg-blue-800"
                  onClick={handleSubmit}
                  disabled={submitting}
                  data-testid="submit-prediction-btn"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : myPrediction ? (
                    "Update Prediction"
                  ) : (
                    "Submit Prediction"
                  )}
                </Button>

                {myPrediction && (
                  <p className="text-center text-sm text-slate-500">
                    Last updated: {format(new Date(myPrediction.updated_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default QuestionDetailPage;
