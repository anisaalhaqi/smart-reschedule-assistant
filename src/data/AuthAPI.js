const users = [
  {
    id: 1,
    name: "Customer Test",
    email: "customer@example.test",
    password: "contoh-password-yang-kuat",
    role: "CUSTOMER",
  },
];

export async function register(user) {
  const existingUser = users.find((item) => item.email === user.email);

  if (existingUser) {
    return {
      error: true,
      data: null,
    };
  }

  const newUser = {
    id: users.length + 1,
    ...user,
    role: "CUSTOMER",
  };

  users.push(newUser);

  return {
    error: false,
    data: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
  };
}

export async function login({ email, password }) {
  const user = users.find((item) => item.email === email && item.password === password);

  if (!user) {
    return {
      error: true,
      data: null,
    };
  }

  return {
    error: false,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
