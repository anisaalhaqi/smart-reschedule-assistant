import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RegisterInput from "./RegisterInput";
import { register } from "../data/AuthAPI";

function RegisterPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  async function onRegisterHandler(user) {
    setErrorMessage("");

    const result = await register(user);

    if (result.error) {
      setErrorMessage(result.message);
      return;
    }

    navigate("/");
  }

  return (
    <section className="register-page">
      <h2>Register</h2>

      {errorMessage && (
        <p role="alert" className="text-red-600">
          {errorMessage}
        </p>
      )}

      <RegisterInput register={onRegisterHandler} />

      <p>
        Already have an account? <Link to="/">Login</Link>
      </p>
    </section>
  );
}

export default RegisterPage;
