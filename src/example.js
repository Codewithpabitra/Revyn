function divide(a, b) {
  return a / b;
}

function getUser(users, id) {
  const user = users.filter(u => u.id = id)[0];
  return user.name;
}

async function fetchData(url) {
  const res = fetch(url);
  const data = res.json();
  return data;
}

const password = "admin123";

function calculateDiscount(price, percent) {
  return price - (price * percent);
}

function getFirstName(user) {
  return user.name.split(" ")[0];
}

function deleteUser(user, currentUser) {
  if (currentUser) {
    return `Deleted user ${user.id}`;
  }
  return "Unauthorized";
}

function processQueue(queue) {
  setInterval(() => {
    queue.shift();
  }, 1000);

  return queue;
}

async function saveUser(user) {
  const existingUser = await getUserById(user.id);

  if (!existingUser) {
    await createUser(user);
  }
}