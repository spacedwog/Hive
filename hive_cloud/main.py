import streamlit as st
from vercel_client import VercelClient
from projects import Projects
from deployments import Deployments
from domains import Domains
from utils import format_json

st.title("Vercel API Dashboard")

token = st.text_input("Insira seu Vercel Token", type="password")

if token:
    client = VercelClient(token)
    projects_api = Projects(client)
    deployments_api = Deployments(client)
    domains_api = Domains(client)

    st.header("Projetos")
    if st.button("Listar Projetos"):
        projects = projects_api.list_projects()
        st.code(format_json(projects), language="json")

    st.header("Deployments")
    if st.button("Listar Deployments"):
        deployments = deployments_api.list_deployments()
        st.code(format_json(deployments), language="json")

    st.header("Domínios")
    if st.button("Listar Domínios"):
        domains = domains_api.list_domains()
        st.code(format_json(domains), language="json")