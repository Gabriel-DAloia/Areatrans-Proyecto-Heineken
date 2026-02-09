import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class HubManagerAPITester:
    def __init__(self, base_url="https://hub-management-app.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_user_id = None
        self.created_hub_id = None
        self.created_record_id = None

    def log_test(self, name: str, passed: bool, message: str = "", response_data: Dict[Any, Any] = None):
        """Log test results"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
            
        result = {
            "name": name,
            "passed": passed,
            "message": message,
            "response_data": response_data
        }
        self.test_results.append(result)
        
        print(f"{status} - {name}")
        if message:
            print(f"    {message}")
        if response_data and not passed:
            print(f"    Response: {response_data}")

    def make_request(self, method: str, endpoint: str, data: Dict[Any, Any] = None, token: str = None, files=None) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        if files is None:
            headers['Content-Type'] = 'application/json'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers={k:v for k,v in headers.items() if k != 'Content-Type'}, 
                                           json=data, files=files)
                else:
                    response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response.status_code, response.json() if response.text else {}
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {str(e)}")
            return 0, {"error": str(e)}
        except json.JSONDecodeError:
            return response.status_code, {"error": "Invalid JSON response"}

    # AUTH TESTS
    def test_admin_login(self):
        """Test admin login with default credentials"""
        status_code, response = self.make_request('POST', 'auth/login', {
            "email": "admin@admin.com",
            "password": "admin123"
        })
        
        if status_code == 200 and "access_token" in response:
            self.admin_token = response["access_token"]
            user_data = response.get("user", {})
            is_admin = user_data.get("is_admin", False)
            self.log_test("Admin Login", is_admin, f"Admin user: {user_data.get('full_name')}", response)
            return True
        else:
            self.log_test("Admin Login", False, f"Status: {status_code}", response)
            return False

    def test_user_registration(self):
        """Test new user registration"""
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        status_code, response = self.make_request('POST', 'auth/register', {
            "email": test_email,
            "password": "testpass123",
            "full_name": "Usuario Test"
        })
        
        if status_code == 200 and "user_id" in response:
            self.created_user_id = response["user_id"]
            self.log_test("User Registration", True, "User registered successfully", response)
            return True
        else:
            self.log_test("User Registration", False, f"Status: {status_code}", response)
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.admin_token:
            self.log_test("Get Current User", False, "No admin token available")
            return False
            
        status_code, response = self.make_request('GET', 'auth/me', token=self.admin_token)
        
        if status_code == 200 and "email" in response:
            self.log_test("Get Current User", True, f"User: {response.get('full_name')}", response)
            return True
        else:
            self.log_test("Get Current User", False, f"Status: {status_code}", response)
            return False

    # ADMIN TESTS
    def test_get_pending_users(self):
        """Test getting pending users (admin only)"""
        if not self.admin_token:
            self.log_test("Get Pending Users", False, "No admin token available")
            return False
            
        status_code, response = self.make_request('GET', 'admin/users/pending', token=self.admin_token)
        
        if status_code == 200 and isinstance(response, list):
            self.log_test("Get Pending Users", True, f"Found {len(response)} pending users", {"count": len(response)})
            return True
        else:
            self.log_test("Get Pending Users", False, f"Status: {status_code}", response)
            return False

    def test_approve_user(self):
        """Test approving a user"""
        if not self.admin_token or not self.created_user_id:
            self.log_test("Approve User", False, "Missing admin token or user ID")
            return False
            
        status_code, response = self.make_request('POST', f'admin/users/{self.created_user_id}/approve', token=self.admin_token)
        
        if status_code == 200 and "message" in response:
            self.log_test("Approve User", True, response.get("message"), response)
            return True
        else:
            self.log_test("Approve User", False, f"Status: {status_code}", response)
            return False

    def test_get_all_users(self):
        """Test getting all users (admin only)"""
        if not self.admin_token:
            self.log_test("Get All Users", False, "No admin token available")
            return False
            
        status_code, response = self.make_request('GET', 'admin/users', token=self.admin_token)
        
        if status_code == 200 and isinstance(response, list):
            self.log_test("Get All Users", True, f"Found {len(response)} total users", {"count": len(response)})
            return True
        else:
            self.log_test("Get All Users", False, f"Status: {status_code}", response)
            return False

    # HUB TESTS
    def test_get_hubs(self):
        """Test getting all hubs"""
        if not self.admin_token:
            self.log_test("Get Hubs", False, "No admin token available")
            return False
            
        status_code, response = self.make_request('GET', 'hubs', token=self.admin_token)
        
        if status_code == 200 and isinstance(response, list):
            hub_count = len(response)
            expected_default_hubs = 6
            self.log_test("Get Hubs", hub_count >= expected_default_hubs, 
                         f"Found {hub_count} hubs (expected at least {expected_default_hubs})", 
                         {"count": hub_count, "hubs": [h.get('name') for h in response[:3]]})
            return hub_count >= expected_default_hubs
        else:
            self.log_test("Get Hubs", False, f"Status: {status_code}", response)
            return False

    def test_create_hub(self):
        """Test creating a new hub (admin only)"""
        if not self.admin_token:
            self.log_test("Create Hub", False, "No admin token available")
            return False
            
        status_code, response = self.make_request('POST', 'hubs', {
            "name": "Test Hub API",
            "description": "Hub creado para testing",
            "location": "Madrid Test"
        }, token=self.admin_token)
        
        if status_code == 200 and "id" in response:
            self.created_hub_id = response["id"]
            self.log_test("Create Hub", True, f"Created hub: {response.get('name')}", response)
            return True
        else:
            self.log_test("Create Hub", False, f"Status: {status_code}", response)
            return False

    def test_update_hub(self):
        """Test updating a hub"""
        if not self.admin_token or not self.created_hub_id:
            self.log_test("Update Hub", False, "Missing admin token or hub ID")
            return False
            
        status_code, response = self.make_request('PUT', f'hubs/{self.created_hub_id}', {
            "name": "Test Hub API Updated",
            "description": "Hub actualizado para testing"
        }, token=self.admin_token)
        
        if status_code == 200 and "name" in response:
            self.log_test("Update Hub", True, f"Updated hub: {response.get('name')}", response)
            return True
        else:
            self.log_test("Update Hub", False, f"Status: {status_code}", response)
            return False

    # CATEGORY TESTS
    def test_get_categories(self):
        """Test getting categories"""
        if not self.admin_token:
            self.log_test("Get Categories", False, "No admin token available")
            return False
            
        status_code, response = self.make_request('GET', 'categories', token=self.admin_token)
        
        if status_code == 200 and isinstance(response, list):
            expected_categories = ["Asistencias", "Liquidaciones", "Flota", "Historico de incidencias", 
                                 "Repartos", "Compras", "Kilos/Litros", "Contactos"]
            found_names = [cat.get("name") for cat in response]
            all_found = all(cat in found_names for cat in expected_categories)
            self.log_test("Get Categories", all_found, 
                         f"Found {len(response)} categories", 
                         {"categories": found_names})
            return all_found
        else:
            self.log_test("Get Categories", False, f"Status: {status_code}", response)
            return False

    # RECORD TESTS
    def test_create_record(self):
        """Test creating a record"""
        if not self.admin_token or not self.created_hub_id:
            self.log_test("Create Record", False, "Missing admin token or hub ID")
            return False
            
        status_code, response = self.make_request('POST', 'records', {
            "hub_id": self.created_hub_id,
            "category": "Asistencias",
            "title": "Test Record API",
            "description": "Registro creado para testing",
            "data": {"test": "data"}
        }, token=self.admin_token)
        
        if status_code == 200 and "id" in response:
            self.created_record_id = response["id"]
            self.log_test("Create Record", True, f"Created record: {response.get('title')}", response)
            return True
        else:
            self.log_test("Create Record", False, f"Status: {status_code}", response)
            return False

    def test_get_records(self):
        """Test getting records"""
        if not self.admin_token:
            self.log_test("Get Records", False, "No admin token available")
            return False
            
        status_code, response = self.make_request('GET', 'records', token=self.admin_token)
        
        if status_code == 200 and isinstance(response, list):
            self.log_test("Get Records", True, f"Found {len(response)} records", {"count": len(response)})
            return True
        else:
            self.log_test("Get Records", False, f"Status: {status_code}", response)
            return False

    def test_get_stats(self):
        """Test getting system statistics"""
        if not self.admin_token:
            self.log_test("Get Stats", False, "No admin token available")
            return False
            
        status_code, response = self.make_request('GET', 'stats', token=self.admin_token)
        
        expected_keys = ["total_hubs", "total_records", "total_users", "pending_users"]
        if status_code == 200 and all(key in response for key in expected_keys):
            self.log_test("Get Stats", True, f"Stats: Hubs={response.get('total_hubs')}, Records={response.get('total_records')}", response)
            return True
        else:
            self.log_test("Get Stats", False, f"Status: {status_code}", response)
            return False

    def cleanup(self):
        """Clean up test data"""
        if self.admin_token and self.created_record_id:
            self.make_request('DELETE', f'records/{self.created_record_id}', token=self.admin_token)
        if self.admin_token and self.created_hub_id:
            self.make_request('DELETE', f'hubs/{self.created_hub_id}', token=self.admin_token)
        if self.admin_token and self.created_user_id:
            self.make_request('DELETE', f'admin/users/{self.created_user_id}', token=self.admin_token)

    def run_all_tests(self):
        """Run all tests in order"""
        print("🚀 Starting Hub Manager API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 50)
        
        # Authentication tests
        self.test_admin_login()
        self.test_user_registration()
        self.test_get_current_user()
        
        # Admin tests
        self.test_get_pending_users()
        self.test_approve_user()
        self.test_get_all_users()
        
        # Hub tests
        self.test_get_hubs()
        self.test_create_hub()
        self.test_update_hub()
        
        # Category tests
        self.test_get_categories()
        
        # Record tests
        self.test_create_record()
        self.test_get_records()
        
        # Stats tests
        self.test_get_stats()
        
        # Cleanup
        self.cleanup()
        
        # Results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  - {result['name']}: {result['message']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = HubManagerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())