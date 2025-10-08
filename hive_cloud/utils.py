import logging

def format_json(data):
    """
    Formata um dicionário ou lista para exibição mais amigável no Streamlit.
    """
    import json
    return json.dumps(data, indent=2, ensure_ascii=False)

def handle_api_error(error):
    """
    Trata erros de requisição da API e retorna uma mensagem amigável.
    """
    logging.error(f"Erro na API: {error}")
    return {
        "success": False,
        "error": str(error)
    }