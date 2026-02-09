"""
Backend API Tests for Kilos/Litros Feature
Tests: GET/POST kilos-litros endpoints, summary, bulk operations, delete
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://settlement-hub-4.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@admin.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API requests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def api_session(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def hub_id(api_session):
    """Get Hub Puerta Toledo ID"""
    response = api_session.get(f"{BASE_URL}/api/hubs")
    assert response.status_code == 200
    hubs = response.json()
    
    hub = next((h for h in hubs if h["name"] == "Hub Puerta Toledo"), None)
    assert hub is not None, "Hub Puerta Toledo not found"
    return hub["id"]


@pytest.fixture(scope="module")
def route_id(api_session, hub_id):
    """Get first available route ID"""
    response = api_session.get(f"{BASE_URL}/api/hubs/{hub_id}/routes")
    assert response.status_code == 200
    routes = response.json()
    
    assert len(routes) > 0, "No routes found for hub"
    return routes[0]["id"]


class TestAuthentication:
    """Test authentication flow"""
    
    def test_login_success(self):
        """Test successful admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True
        print(f"✓ Login successful for {ADMIN_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")


class TestHubsAndRoutes:
    """Test hubs and routes endpoints"""
    
    def test_get_hubs(self, api_session):
        """Test getting all hubs"""
        response = api_session.get(f"{BASE_URL}/api/hubs")
        assert response.status_code == 200
        
        hubs = response.json()
        assert isinstance(hubs, list)
        assert len(hubs) >= 1
        
        hub_names = [h["name"] for h in hubs]
        assert "Hub Puerta Toledo" in hub_names
        print(f"✓ Found {len(hubs)} hubs")
    
    def test_get_routes(self, api_session, hub_id):
        """Test getting routes for a hub"""
        response = api_session.get(f"{BASE_URL}/api/hubs/{hub_id}/routes")
        assert response.status_code == 200
        
        routes = response.json()
        assert isinstance(routes, list)
        assert len(routes) >= 1
        
        # Verify route structure
        route = routes[0]
        assert "id" in route
        assert "name" in route
        assert "hub_id" in route
        print(f"✓ Found {len(routes)} routes: {[r['name'] for r in routes]}")


class TestKilosLitrosEntries:
    """Test Kilos/Litros CRUD operations"""
    
    def test_get_kilos_litros_entries(self, api_session, hub_id):
        """Test getting kilos/litros entries for current month"""
        now = datetime.now()
        params = {"year": now.year, "month": now.month}
        
        response = api_session.get(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros",
            params=params
        )
        assert response.status_code == 200
        
        entries = response.json()
        assert isinstance(entries, list)
        
        if len(entries) > 0:
            entry = entries[0]
            assert "id" in entry
            assert "hub_id" in entry
            assert "route_id" in entry
            assert "repartidor" in entry
            assert "kilos" in entry
            assert "litros" in entry
            assert "bultos" in entry
            assert "clientes" in entry
        
        print(f"✓ Got {len(entries)} kilos/litros entries")
    
    def test_create_kilos_litros_entry(self, api_session, hub_id, route_id):
        """Test creating a new kilos/litros entry"""
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        
        payload = {
            "hub_id": hub_id,
            "route_id": route_id,
            "date": date_str,
            "repartidor": "TEST_pedro",
            "clientes": 25,
            "kilos": 85.75,
            "litros": 32.50,
            "bultos": 15
        }
        
        response = api_session.post(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros",
            json=payload
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["repartidor"] == "test_pedro"  # Should be lowercase
        assert data["kilos"] == 85.75
        assert data["litros"] == 32.50
        assert data["bultos"] == 15
        assert data["clientes"] == 25
        
        print(f"✓ Created kilos/litros entry with ID: {data['id']}")
        return data["id"]
    
    def test_verify_entry_persisted(self, api_session, hub_id):
        """Verify created entry appears in GET request"""
        now = datetime.now()
        params = {"year": now.year, "month": now.month}
        
        response = api_session.get(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros",
            params=params
        )
        assert response.status_code == 200
        
        entries = response.json()
        test_entry = next((e for e in entries if e["repartidor"] == "test_pedro"), None)
        assert test_entry is not None, "Test entry not found in GET response"
        
        print("✓ Entry verified in database")
        return test_entry["id"]
    
    def test_delete_kilos_litros_entry(self, api_session, hub_id):
        """Test deleting a kilos/litros entry"""
        # First get the test entry
        now = datetime.now()
        params = {"year": now.year, "month": now.month}
        
        response = api_session.get(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros",
            params=params
        )
        entries = response.json()
        test_entry = next((e for e in entries if e["repartidor"] == "test_pedro"), None)
        
        if test_entry:
            entry_id = test_entry["id"]
            
            # Delete the entry
            delete_response = api_session.delete(
                f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros/{entry_id}"
            )
            assert delete_response.status_code == 200
            
            # Verify deletion
            verify_response = api_session.get(
                f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros",
                params=params
            )
            entries_after = verify_response.json()
            deleted_entry = next((e for e in entries_after if e["id"] == entry_id), None)
            assert deleted_entry is None, "Entry still exists after deletion"
            
            print("✓ Entry deleted and verified")
        else:
            print("⚠ No test entry to delete")


class TestKilosLitrosSummary:
    """Test Kilos/Litros summary endpoint"""
    
    def test_get_summary(self, api_session, hub_id):
        """Test getting monthly summary"""
        now = datetime.now()
        params = {"year": now.year, "month": now.month}
        
        response = api_session.get(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros/summary",
            params=params
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "year" in data
        assert "month" in data
        assert "totals" in data
        assert "by_repartidor" in data
        assert "by_route" in data
        
        # Verify totals structure
        totals = data["totals"]
        assert "clientes" in totals
        assert "kilos" in totals
        assert "litros" in totals
        assert "bultos" in totals
        
        print(f"✓ Summary totals: {totals}")
    
    def test_summary_by_repartidor(self, api_session, hub_id):
        """Test summary breakdown by employee"""
        now = datetime.now()
        params = {"year": now.year, "month": now.month}
        
        response = api_session.get(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros/summary",
            params=params
        )
        assert response.status_code == 200
        
        data = response.json()
        by_repartidor = data["by_repartidor"]
        
        if len(by_repartidor) > 0:
            rep = by_repartidor[0]
            assert "repartidor" in rep
            assert "kilos" in rep
            assert "litros" in rep
            assert "bultos" in rep
            assert "clientes" in rep
            print(f"✓ Found {len(by_repartidor)} repartidores in summary")
        else:
            print("⚠ No repartidor data in summary")
    
    def test_summary_by_route(self, api_session, hub_id):
        """Test summary breakdown by route"""
        now = datetime.now()
        params = {"year": now.year, "month": now.month}
        
        response = api_session.get(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros/summary",
            params=params
        )
        assert response.status_code == 200
        
        data = response.json()
        by_route = data["by_route"]
        
        assert isinstance(by_route, list)
        
        if len(by_route) > 0:
            route = by_route[0]
            assert "route_id" in route
            assert "route_name" in route
            assert "kilos" in route
            assert "litros" in route
            assert "bultos" in route
            assert "clientes" in route
            print(f"✓ Found {len(by_route)} routes in summary")


class TestKilosLitrosBulk:
    """Test bulk operations"""
    
    def test_bulk_create(self, api_session, hub_id, route_id):
        """Test bulk entry creation"""
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        
        entries = [
            {
                "hub_id": hub_id,
                "route_id": route_id,
                "date": date_str,
                "repartidor": "TEST_bulk1",
                "clientes": 10,
                "kilos": 50.0,
                "litros": 20.0,
                "bultos": 5
            },
            {
                "hub_id": hub_id,
                "route_id": route_id,
                "date": date_str,
                "repartidor": "TEST_bulk2",
                "clientes": 12,
                "kilos": 60.0,
                "litros": 25.0,
                "bultos": 8
            }
        ]
        
        response = api_session.post(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros/bulk",
            json=entries
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["count"] == 2
        print(f"✓ Bulk created {data['count']} entries")
    
    def test_cleanup_bulk_entries(self, api_session, hub_id):
        """Clean up bulk test entries"""
        now = datetime.now()
        params = {"year": now.year, "month": now.month}
        
        response = api_session.get(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros",
            params=params
        )
        entries = response.json()
        
        deleted = 0
        for entry in entries:
            if entry["repartidor"].startswith("test_bulk"):
                del_resp = api_session.delete(
                    f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros/{entry['id']}"
                )
                if del_resp.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} bulk test entries")


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_get_entries_invalid_hub(self, api_session):
        """Test getting entries for non-existent hub"""
        response = api_session.get(
            f"{BASE_URL}/api/hubs/invalid-hub-id/kilos-litros",
            params={"year": 2026, "month": 2}
        )
        # Should return empty list, not error
        assert response.status_code == 200
        print("✓ Invalid hub returns empty list")
    
    def test_delete_invalid_entry(self, api_session, hub_id):
        """Test deleting non-existent entry"""
        response = api_session.delete(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros/invalid-entry-id"
        )
        assert response.status_code == 404
        print("✓ Delete invalid entry returns 404")
    
    def test_create_entry_invalid_route(self, api_session, hub_id):
        """Test creating entry with invalid route"""
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        
        payload = {
            "hub_id": hub_id,
            "route_id": "invalid-route-id",
            "date": date_str,
            "repartidor": "test_invalid",
            "clientes": 5,
            "kilos": 10.0,
            "litros": 5.0,
            "bultos": 2
        }
        
        response = api_session.post(
            f"{BASE_URL}/api/hubs/{hub_id}/kilos-litros",
            json=payload
        )
        assert response.status_code == 404
        print("✓ Create with invalid route returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
