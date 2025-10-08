import streamlit as st
import os
from dotenv import dotenv_values
from vercel_client import VercelClient
from projects import Projects
from deployments import Deployments
from domains import Domains
from utils import format_json

st.title("Vercel API Dashboard")

# 🔹 Carrega todos os tokens do arquivo .env
env_tokens = dotenv_values(".env")

# 🔹 Filtra apenas as variáveis que contêm 'CLOUD_TOKEN'
token_list = {key: value for key, value in env_tokens.items() if "CLOUD_TOKEN" in key}

# 🔹 Exibe o <select> com os tokens disponíveis
if token_list:
    st.subheader("Selecione o token da Vercel (.env)")
    selected_key = st.selectbox(
        "Escolha um token disponível:",
        list(token_list.keys()),
        index=0,  # seleciona o primeiro por padrão
    )
    token = token_list[selected_key]
    st.info(f"Token selecionado: {selected_key}")
else:
    token = st.text_input("Insira seu Vercel Token", type="password")

# 🔹 Inicializa as APIs se um token estiver selecionado
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

# Primeiro, pega os projetos disponíveis
projects = projects_api.list_projects()
project_names = [p["name"] for p in projects.get("projects", [])]

selected_project = st.selectbox(
    "Selecione um projeto para ver os deployments:",
    project_names or ["Nenhum projeto encontrado"],
)

if st.button("Listar Deployments"):
    if selected_project != "Nenhum projeto encontrado":
        deployments = deployments_api.list_deployments(params={"project": selected_project})
        st.code(format_json(deployments), language="json")
    else:
        st.warning("Nenhum projeto disponível para listar os deployments.")

    st.header("Domínios")
    if st.button("Listar Domínios"):
        domains = domains_api.list_domains()
        st.code(format_json(domains), language="json")