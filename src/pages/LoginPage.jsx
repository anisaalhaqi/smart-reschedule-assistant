import PropTypes from "prop-types";
import { useState } from "react";
import { Link } from "react-router-dom";
import LoginInput from "./LoginInput";
import { login } from "../data/AuthAPI";

function LoginPage({ loginSuccess }) {
  const [errorMessage, setErrorMessage] = useState("");

  async function onLogin({ email, password }) {
    setErrorMessage("");

    const result = await login({ email, password });

    if (result.error) {
      setErrorMessage(result.message);
      return;
    }

    loginSuccess(result.data);
  }

  return (
    <section className="login-page">
      <h2>Login</h2>

      {errorMessage && (
        <p role="alert" className="text-red-600">
          {errorMessage}
        </p>
      )}

      <LoginInput login={onLogin} />

      <p>
        Belum punya akun? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}

LoginPage.propTypes = {
  loginSuccess: PropTypes.func.isRequired,
};

export default LoginPage;
