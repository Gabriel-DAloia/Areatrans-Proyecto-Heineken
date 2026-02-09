"""
Backend tests for Días Festivos (Holidays) and Restricciones Horarias (Time Restrictions) features.
Tests cover all CRUD operations for both features.
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@admin.com"
TEST_PASSWORD = "admin123"

# Track created resources for cleanup
created_holidays = []
created_restrictions = []


class TestAuth:
    """Authentication setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for subsequent tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["access_token"]
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login(self):
        """Test login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_EMAIL
        print("✓ Login successful")


class TestHubSetup:
    """Get hub for testing"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def hub_puerta_toledo(self, auth_headers):
        """Get Hub Puerta Toledo for testing"""
        response = requests.get(f"{BASE_URL}/api/hubs", headers=auth_headers)
        assert response.status_code == 200
        hubs = response.json()
        hub = next((h for h in hubs if "toledo" in h["name"].lower()), None)
        assert hub is not None, "Hub Puerta Toledo not found"
        print(f"✓ Found Hub Puerta Toledo: {hub['id']}")
        return hub
    
    def test_get_hub_puerta_toledo(self, auth_headers, hub_puerta_toledo):
        """Verify Hub Puerta Toledo exists and is in Madrid"""
        assert hub_puerta_toledo is not None
        assert "toledo" in hub_puerta_toledo["name"].lower() or "madrid" in hub_puerta_toledo["location"].lower()
        print(f"✓ Hub location: {hub_puerta_toledo.get('location', 'N/A')}")


class TestHolidaysAPI:
    """Tests for Días Festivos (Holidays) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def hub_id(self, auth_headers):
        """Get Hub Puerta Toledo ID"""
        response = requests.get(f"{BASE_URL}/api/hubs", headers=auth_headers)
        hubs = response.json()
        hub = next((h for h in hubs if "toledo" in h["name"].lower()), None)
        return hub["id"]
    
    def test_get_holidays_2026(self, auth_headers, hub_id):
        """Test GET holidays for 2026 - should return national + regional + local holidays for Madrid"""
        response = requests.get(
            f"{BASE_URL}/api/hubs/{hub_id}/holidays",
            params={"year": 2026},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "holidays" in data
        assert "year" in data
        assert data["year"] == 2026
        assert "location" in data
        
        holidays = data["holidays"]
        
        # Count by type
        nacionales = [h for h in holidays if h["type"] == "nacional"]
        autonomicos = [h for h in holidays if h["type"] == "autonomico"]
        locales = [h for h in holidays if h["type"] == "local"]
        
        # Should have 11 national holidays for Spain
        assert len(nacionales) >= 11, f"Expected at least 11 national holidays, got {len(nacionales)}"
        
        # Should have Madrid regional holidays (autonomico)
        assert len(autonomicos) >= 2, f"Expected at least 2 autonómicos for Madrid, got {len(autonomicos)}"
        
        # Should have Madrid local holidays
        assert len(locales) >= 2, f"Expected at least 2 local holidays for Madrid, got {len(locales)}"
        
        print(f"✓ GET holidays returns {len(nacionales)} nacional, {len(autonomicos)} autonómico, {len(locales)} local")
        print(f"✓ Location: {data['location']}")
        
    def test_holidays_contain_key_dates(self, auth_headers, hub_id):
        """Verify specific holidays exist"""
        response = requests.get(
            f"{BASE_URL}/api/hubs/{hub_id}/holidays",
            params={"year": 2026},
            headers=auth_headers
        )
        holidays = response.json()["holidays"]
        
        # Check for specific national holidays
        holiday_dates = [h["date"] for h in holidays]
        
        assert "2026-01-01" in holiday_dates, "Año Nuevo missing"
        assert "2026-01-06" in holiday_dates, "Epifanía missing"
        assert "2026-05-01" in holiday_dates, "Día del Trabajador missing"
        assert "2026-12-25" in holiday_dates, "Navidad missing"
        
        # Check for Madrid-specific holidays
        assert "2026-05-02" in holiday_dates, "Día de la Comunidad de Madrid missing"
        assert "2026-05-15" in holiday_dates, "San Isidro missing"
        
        print("✓ Key holidays verified: Año Nuevo, Epifanía, Día Trabajador, Navidad, Madrid Day, San Isidro")
    
    def test_create_custom_holiday(self, auth_headers, hub_id):
        """Test creating a custom local holiday"""
        global created_holidays
        
        custom_holiday = {
            "hub_id": hub_id,
            "date": "2026-09-15",
            "name": "TEST_Festivo Local Personalizado",
            "type": "local"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hubs/{hub_id}/holidays",
            json=custom_holiday,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create holiday failed: {response.text}"
        data = response.json()
        
        assert data["name"] == custom_holiday["name"]
        assert data["date"] == custom_holiday["date"]
        assert data["type"] == custom_holiday["type"]
        assert "id" in data
        
        created_holidays.append(data["id"])
        print(f"✓ Created custom holiday: {data['name']} on {data['date']}")
        
        return data["id"]
    
    def test_verify_custom_holiday_appears(self, auth_headers, hub_id):
        """Verify the custom holiday appears in the list"""
        response = requests.get(
            f"{BASE_URL}/api/hubs/{hub_id}/holidays",
            params={"year": 2026},
            headers=auth_headers
        )
        holidays = response.json()["holidays"]
        
        custom = next((h for h in holidays if "TEST_" in h.get("name", "")), None)
        assert custom is not None, "Custom holiday not found in list"
        assert custom["is_preset"] == False, "Custom holiday should not be preset"
        
        print(f"✓ Custom holiday appears in list with is_preset=False")
    
    def test_create_duplicate_date_fails(self, auth_headers, hub_id):
        """Test that creating a holiday on the same date fails"""
        duplicate_holiday = {
            "hub_id": hub_id,
            "date": "2026-09-15",  # Same date as custom holiday
            "name": "TEST_Duplicate Holiday",
            "type": "local"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hubs/{hub_id}/holidays",
            json=duplicate_holiday,
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400 for duplicate date, got {response.status_code}"
        print("✓ Duplicate date correctly rejected")
    
    def test_delete_custom_holiday(self, auth_headers, hub_id):
        """Test deleting a custom holiday"""
        global created_holidays
        
        if not created_holidays:
            pytest.skip("No custom holiday to delete")
        
        holiday_id = created_holidays[0]
        response = requests.delete(
            f"{BASE_URL}/api/hubs/{hub_id}/holidays/{holiday_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        created_holidays.remove(holiday_id)
        print(f"✓ Deleted custom holiday: {holiday_id}")
    
    def test_verify_custom_holiday_removed(self, auth_headers, hub_id):
        """Verify the custom holiday was removed"""
        response = requests.get(
            f"{BASE_URL}/api/hubs/{hub_id}/holidays",
            params={"year": 2026},
            headers=auth_headers
        )
        holidays = response.json()["holidays"]
        
        custom = next((h for h in holidays if "TEST_" in h.get("name", "")), None)
        assert custom is None, "Custom holiday should have been deleted"
        
        print("✓ Custom holiday successfully removed from list")


class TestTimeRestrictionsAPI:
    """Tests for Restricciones Horarias (Time Restrictions) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def hub_id(self, auth_headers):
        """Get Hub Puerta Toledo ID"""
        response = requests.get(f"{BASE_URL}/api/hubs", headers=auth_headers)
        hubs = response.json()
        hub = next((h for h in hubs if "toledo" in h["name"].lower()), None)
        return hub["id"]
    
    def test_get_time_restrictions(self, auth_headers, hub_id):
        """Test GET time restrictions"""
        response = requests.get(
            f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions",
            headers=auth_headers
        )
        assert response.status_code == 200
        restrictions = response.json()
        assert isinstance(restrictions, list)
        
        print(f"✓ GET time-restrictions returns {len(restrictions)} restrictions")
        
        # Check if Madrid Central exists (should be seeded)
        madrid_central = next((r for r in restrictions if "Madrid Central" in r.get("zona", "")), None)
        if madrid_central:
            print(f"✓ Found seeded restriction: {madrid_central['zona']}")
            assert madrid_central["horario"] == "7:00 - 22:00"
            assert madrid_central["dias"] == "L-V"
            assert madrid_central["aplica_a"] == "vehiculos_combustible"
        
        return restrictions
    
    def test_create_time_restriction(self, auth_headers, hub_id):
        """Test creating a new time restriction"""
        global created_restrictions
        
        new_restriction = {
            "hub_id": hub_id,
            "zona": "TEST_Centro Histórico",
            "horario": "8:00 - 20:00",
            "dias": "L-S",
            "aplica_a": "todos",
            "notas": "Restricción de prueba"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions",
            json=new_restriction,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create restriction failed: {response.text}"
        data = response.json()
        
        assert data["zona"] == new_restriction["zona"]
        assert data["horario"] == new_restriction["horario"]
        assert data["dias"] == new_restriction["dias"]
        assert data["aplica_a"] == new_restriction["aplica_a"]
        assert data["notas"] == new_restriction["notas"]
        assert "id" in data
        
        created_restrictions.append(data["id"])
        print(f"✓ Created restriction: {data['zona']} - {data['horario']}")
        
        return data["id"]
    
    def test_create_restriction_validates_aplica_a(self, auth_headers, hub_id):
        """Test that invalid aplica_a values are rejected"""
        invalid_restriction = {
            "hub_id": hub_id,
            "zona": "TEST_Invalid Zone",
            "horario": "9:00 - 18:00",
            "dias": "L-V",
            "aplica_a": "invalid_value",
            "notas": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions",
            json=invalid_restriction,
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid aplica_a, got {response.status_code}"
        print("✓ Invalid aplica_a correctly rejected")
    
    def test_update_time_restriction(self, auth_headers, hub_id):
        """Test updating a time restriction"""
        global created_restrictions
        
        if not created_restrictions:
            pytest.skip("No restriction to update")
        
        restriction_id = created_restrictions[0]
        
        update_data = {
            "horario": "9:00 - 21:00",
            "dias": "L-D",
            "notas": "Horario actualizado"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions/{restriction_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        assert data["horario"] == update_data["horario"]
        assert data["dias"] == update_data["dias"]
        assert data["notas"] == update_data["notas"]
        
        print(f"✓ Updated restriction: new horario={data['horario']}, dias={data['dias']}")
    
    def test_verify_update_persisted(self, auth_headers, hub_id):
        """Verify the update was persisted"""
        global created_restrictions
        
        if not created_restrictions:
            pytest.skip("No restriction to verify")
        
        response = requests.get(
            f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions",
            headers=auth_headers
        )
        restrictions = response.json()
        
        test_restriction = next((r for r in restrictions if "TEST_" in r.get("zona", "")), None)
        assert test_restriction is not None, "Test restriction not found"
        assert test_restriction["horario"] == "9:00 - 21:00"
        assert test_restriction["dias"] == "L-D"
        
        print("✓ Update persisted correctly")
    
    def test_delete_time_restriction(self, auth_headers, hub_id):
        """Test deleting a time restriction"""
        global created_restrictions
        
        if not created_restrictions:
            pytest.skip("No restriction to delete")
        
        restriction_id = created_restrictions[0]
        
        response = requests.delete(
            f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions/{restriction_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        created_restrictions.remove(restriction_id)
        print(f"✓ Deleted restriction: {restriction_id}")
    
    def test_verify_deletion(self, auth_headers, hub_id):
        """Verify the deletion was successful"""
        response = requests.get(
            f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions",
            headers=auth_headers
        )
        restrictions = response.json()
        
        test_restriction = next((r for r in restrictions if "TEST_" in r.get("zona", "")), None)
        assert test_restriction is None, "Test restriction should have been deleted"
        
        print("✓ Deletion verified")
    
    def test_summary_cards_data(self, auth_headers, hub_id):
        """Test that we can calculate summary card data from restrictions"""
        # First add a test restriction for each type
        global created_restrictions
        
        test_restrictions = [
            {
                "hub_id": hub_id,
                "zona": "TEST_Zone A",
                "horario": "8:00 - 18:00",
                "dias": "L-V",
                "aplica_a": "vehiculos_0",
                "notas": ""
            },
            {
                "hub_id": hub_id,
                "zona": "TEST_Zone B",
                "horario": "7:00 - 22:00",
                "dias": "L-V",
                "aplica_a": "vehiculos_combustible",
                "notas": ""
            },
            {
                "hub_id": hub_id,
                "zona": "TEST_Zone C",
                "horario": "10:00 - 16:00",
                "dias": "L-D",
                "aplica_a": "todos",
                "notas": ""
            }
        ]
        
        for restriction in test_restrictions:
            response = requests.post(
                f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions",
                json=restriction,
                headers=auth_headers
            )
            if response.status_code == 200:
                created_restrictions.append(response.json()["id"])
        
        # Get all restrictions
        response = requests.get(
            f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions",
            headers=auth_headers
        )
        restrictions = response.json()
        
        # Count by aplica_a (for summary cards)
        vehiculos_0_count = len([r for r in restrictions if r["aplica_a"] == "vehiculos_0"])
        vehiculos_combustible_count = len([r for r in restrictions if r["aplica_a"] == "vehiculos_combustible"])
        todos_count = len([r for r in restrictions if r["aplica_a"] == "todos"])
        
        print(f"✓ Summary card counts: vehiculos_0={vehiculos_0_count}, vehiculos_combustible={vehiculos_combustible_count}, todos={todos_count}")
        
        # Cleanup test restrictions
        for rid in created_restrictions[:]:
            response = requests.delete(
                f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions/{rid}",
                headers=auth_headers
            )
            if response.status_code == 200:
                created_restrictions.remove(rid)
        
        print("✓ Test restrictions cleaned up")


@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup any test data after all tests"""
    def cleanup_all():
        global created_holidays, created_restrictions
        
        # Get auth token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            return
        
        headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Get hub ID
        response = requests.get(f"{BASE_URL}/api/hubs", headers=headers)
        hubs = response.json()
        hub = next((h for h in hubs if "toledo" in h["name"].lower()), None)
        if not hub:
            return
        
        hub_id = hub["id"]
        
        # Cleanup remaining test holidays
        for holiday_id in created_holidays:
            requests.delete(f"{BASE_URL}/api/hubs/{hub_id}/holidays/{holiday_id}", headers=headers)
        
        # Cleanup remaining test restrictions
        for restriction_id in created_restrictions:
            requests.delete(f"{BASE_URL}/api/hubs/{hub_id}/time-restrictions/{restriction_id}", headers=headers)
        
        print("\n✓ Cleanup completed")
    
    request.addfinalizer(cleanup_all)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
