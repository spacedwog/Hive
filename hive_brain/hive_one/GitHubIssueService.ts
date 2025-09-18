export class GitHubIssueService {
  private token: string;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  async abrirIssue(titulo: string, corpo: string): Promise<number | null> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/issues`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `token ${this.token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title: titulo, body: corpo })
    });
    if (response.status === 201) {
      const data = await response.json();
      return data.number;
    }
    return null;
  }

  async fecharIssue(numero: number): Promise<boolean> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/issues/${numero}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Authorization": `token ${this.token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ state: "closed" })
    });
    return response.status === 200;
  }
}