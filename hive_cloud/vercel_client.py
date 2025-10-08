import requests

class VercelClient:
    BASE_URL = "https://api.vercel.com"

    def __init__(self, token: str):
        self.token = token

    def get(self, endpoint: str, params=None):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.BASE_URL}{endpoint}", headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def post(self, endpoint: str, data=None):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(f"{self.BASE_URL}{endpoint}", headers=headers, json=data)
        response.raise_for_status()
        return response.json()
