import getpass
import sys

from core.auth import hash_password, load_users, save_users


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in {"add", "remove", "list"}:
        print("Uso: python manage_users.py add <usuario> [nome exibido]")
        print("     python manage_users.py remove <usuario>")
        print("     python manage_users.py list")
        raise SystemExit(1)

    action = sys.argv[1]
    users = load_users()
    if action == "list":
        for user in users:
            print(f"{user['username']} — {user.get('display_name') or user['username']}")
        return

    if len(sys.argv) < 3:
        raise SystemExit("Informe o nome do usuário.")
    username = sys.argv[2].strip().lower()
    if not username or any(item.get("username", "").lower() == username for item in users):
        raise SystemExit("Usuário vazio ou já cadastrado.")

    if action == "remove":
        save_users([item for item in users if item.get("username", "").lower() != username])
        print(f"Usuário removido: {username}")
        return

    password = getpass.getpass("Senha: ")
    confirmation = getpass.getpass("Repita a senha: ")
    if len(password) < 8:
        raise SystemExit("Use uma senha com pelo menos 8 caracteres.")
    if password != confirmation:
        raise SystemExit("As senhas não conferem.")
    display_name = " ".join(sys.argv[3:]).strip() or username
    users.append({"username": username, "display_name": display_name, "password_hash": hash_password(password)})
    save_users(users)
    print(f"Usuário criado: {username}")


if __name__ == "__main__":
    main()
