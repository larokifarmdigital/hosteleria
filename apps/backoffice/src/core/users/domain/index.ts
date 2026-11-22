// core/users no tiene modelo propio: la cuenta (`User`, `UserRepository`) vive en
// core/auth, porque el inicio de sesión y la gestión de cuentas comparten el mismo
// modelo y así el grafo queda sin ciclos (auth ← restaurants ← users).
export {};
