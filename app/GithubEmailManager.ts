import { Linking } from "react-native";

type GithubUser = {
  login: string;
  id: number;
  email?: string | null;
  html_url: string;
  avatar_url: string;
};

export class GithubEmailManager {
  private usersWithEmail: GithubUser[] = [];

  // Adiciona usuários com e-mail válido
  public setUsers(users: GithubUser[]) {
    this.usersWithEmail = users.filter(u => u.email);
  }

  // Retorna todos os usuários com e-mail
  public getUsers(): GithubUser[] {
    return this.usersWithEmail;
  }

  // Envia e-mail para o usuário pelo app nativo
  public sendEmail(userLogin: string, subject: string, body: string) {
    const user = this.usersWithEmail.find(u => u.login === userLogin);
    if (!user || !user.email) {
      console.warn(`Usuário ${userLogin} não possui e-mail disponível.`);
      return;
    }

    const email = user.email;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(url)
      .then(supported => {
        if (!supported) console.warn("Não foi possível abrir o app de e-mail.");
        else return Linking.openURL(url);
      })
      .catch(err => console.error("Erro ao abrir o app de e-mail:", err));
  }
}