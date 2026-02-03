import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class SignalRankingAPITester:
    def __init__(self, base_url="https://predictify-36.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_platform_stats(self):
        """Test platform stats endpoint (public)"""
        return self.run_test("Platform Stats", "GET", "stats", 200)

    def test_categories(self):
        """Test categories endpoint (public)"""
        return self.run_test("Categories", "GET", "categories", 200)

    def test_signup(self, email, name, password):
        """Test user signup"""
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data={"email": email, "name": name, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user_id']
            self.log(f"   Signed up user: {response['name']} ({response['email']})")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user_id']
            self.log(f"   Logged in user: {response['name']} ({response['email']})")
            return True
        return False

    def test_auth_me(self):
        """Test get current user info"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            self.log(f"   User: {response.get('name')} - Role: {response.get('role')}")
        return success

    def test_get_questions(self):
        """Test get questions (public)"""
        success, response = self.run_test("Get Questions", "GET", "questions", 200)
        if success:
            self.log(f"   Found {len(response)} questions")
        return success, response

    def test_create_question(self, title, description, category):
        """Test create question (admin only)"""
        closing_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        success, response = self.run_test(
            "Create Question",
            "POST",
            "questions",
            200,
            data={
                "title": title,
                "description": description,
                "category": category,
                "closing_date": closing_date,
                "resolution_source": "Test source"
            }
        )
        if success:
            self.log(f"   Created question: {response.get('question_id')}")
            return response.get('question_id')
        return None

    def test_get_question(self, question_id):
        """Test get single question"""
        success, response = self.run_test("Get Single Question", "GET", f"questions/{question_id}", 200)
        return success, response

    def test_create_prediction(self, question_id, probability):
        """Test create prediction"""
        success, response = self.run_test(
            "Create Prediction",
            "POST",
            "predictions",
            200,
            data={"question_id": question_id, "probability": probability}
        )
        if success:
            self.log(f"   Created prediction: {probability}% for question {question_id}")
        return success, response

    def test_get_my_prediction(self, question_id):
        """Test get my prediction for a question"""
        return self.run_test("Get My Prediction", "GET", f"predictions/my/{question_id}", 200)

    def test_resolve_question(self, question_id, outcome):
        """Test resolve question (admin only)"""
        success, response = self.run_test(
            "Resolve Question",
            "PUT",
            f"questions/{question_id}/resolve",
            200,
            data={"outcome": outcome}
        )
        if success:
            self.log(f"   Resolved question {question_id} as {'YES' if outcome else 'NO'}")
        return success

    def test_leaderboard(self):
        """Test leaderboard"""
        success, response = self.run_test("Get Leaderboard", "GET", "leaderboard", 200)
        if success:
            self.log(f"   Leaderboard has {len(response)} users")
        return success

    def test_user_profile(self, user_id):
        """Test user profile"""
        success, response = self.run_test("Get User Profile", "GET", f"users/{user_id}/profile", 200)
        if success:
            self.log(f"   Profile for: {response.get('name')} - Accuracy: {response.get('accuracy_score', 0):.1f}%")
        return success

    def test_get_users(self):
        """Test get all users (admin only)"""
        success, response = self.run_test("Get All Users", "GET", "users", 200)
        if success:
            self.log(f"   Found {len(response)} users")
        return success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test("Logout", "POST", "auth/logout", 200)
        if success:
            self.token = None
            self.user_id = None
        return success

def main():
    tester = SignalRankingAPITester()
    
    # Generate unique test data
    timestamp = datetime.now().strftime('%H%M%S')
    test_email = f"test.user.{timestamp}@signalranking.com"
    test_name = f"Test User {timestamp}"
    test_password = "TestPass123!"
    
    admin_email = "admin@signalranking.com"
    admin_password = "AdminPass123!"
    
    tester.log("🚀 Starting SignalRanking API Tests")
    
    # Test public endpoints
    tester.log("\n📊 Testing Public Endpoints")
    tester.test_platform_stats()
    tester.test_categories()
    tester.test_get_questions()
    
    # Test user authentication
    tester.log("\n🔐 Testing User Authentication")
    if not tester.test_signup(test_email, test_name, test_password):
        tester.log("❌ Signup failed, stopping user tests")
        return 1
    
    tester.test_auth_me()
    
    # Test user functionality
    tester.log("\n👤 Testing User Functionality")
    success, questions = tester.test_get_questions()
    if success and questions:
        # Test prediction on existing question
        question_id = questions[0]['question_id']
        tester.test_get_question(question_id)
        tester.test_create_prediction(question_id, 75.5)
        tester.test_get_my_prediction(question_id)
    
    tester.test_leaderboard()
    if tester.user_id:
        tester.test_user_profile(tester.user_id)
    
    # Test admin functionality
    tester.log("\n🛡️ Testing Admin Functionality")
    
    # Try to create admin user (might fail if exists)
    admin_signup_success = tester.test_signup(admin_email, "Admin User", admin_password)
    if not admin_signup_success:
        # Try to login as existing admin
        if not tester.test_login(admin_email, admin_password):
            tester.log("⚠️ No admin access available, skipping admin tests")
        else:
            tester.log("✅ Logged in as existing admin")
    else:
        # Need to manually set admin role - this would normally be done via database
        tester.log("⚠️ New admin user created but role not set - admin tests may fail")
    
    if tester.token:
        tester.test_get_users()
        
        # Create a test question
        question_id = tester.test_create_question(
            f"Test Question {timestamp}",
            "This is a test question for API testing",
            "Tech"
        )
        
        if question_id:
            # Test prediction on new question
            tester.test_create_prediction(question_id, 60.0)
            # Test resolving question
            tester.test_resolve_question(question_id, True)
            # Check leaderboard after resolution
            tester.test_leaderboard()
    
    # Test logout
    tester.log("\n🚪 Testing Logout")
    tester.test_logout()
    
    # Print results
    tester.log(f"\n📈 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        tester.log("🎉 All tests passed!")
        return 0
    else:
        tester.log(f"⚠️ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())