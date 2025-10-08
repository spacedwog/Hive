from vercel_client import VercelClient

class Domains:
    def __init__(self, client: VercelClient):
        self.client = client

    def list_domains(self):
        return self.client.get("/v6/domains")

    def get_domain(self, domain_name):
        return self.client.get(f"/v6/domains/{domain_name}")