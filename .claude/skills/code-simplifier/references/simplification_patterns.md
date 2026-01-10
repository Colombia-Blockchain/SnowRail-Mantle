# Code Simplification Patterns

## Conditional Logic

### Before: Nested Ternaries

```typescript
const message = isAdmin
  ? hasPermission
    ? 'Full access'
    : 'Limited admin'
  : isGuest
    ? 'Guest access'
    : 'No access';
```

### After: Clear Function

```typescript
function getAccessMessage(user: User): string {
  if (user.isAdmin && user.hasPermission) return 'Full access';
  if (user.isAdmin) return 'Limited admin';
  if (user.isGuest) return 'Guest access';
  return 'No access';
}
```

---

## Early Returns

### Before: Deeply Nested

```typescript
function processOrder(order: Order): Result {
  if (order) {
    if (order.items.length > 0) {
      if (order.payment) {
        // actual logic here
        return { success: true };
      } else {
        return { error: 'No payment' };
      }
    } else {
      return { error: 'No items' };
    }
  } else {
    return { error: 'No order' };
  }
}
```

### After: Guard Clauses

```typescript
function processOrder(order: Order): Result {
  if (!order) return { error: 'No order' };
  if (order.items.length === 0) return { error: 'No items' };
  if (!order.payment) return { error: 'No payment' };

  // actual logic here
  return { success: true };
}
```

---

## Redundant State

### Before: Derived State Stored

```typescript
const [items, setItems] = useState<Item[]>([]);
const [itemCount, setItemCount] = useState(0);
const [hasItems, setHasItems] = useState(false);

function addItem(item: Item) {
  const newItems = [...items, item];
  setItems(newItems);
  setItemCount(newItems.length);
  setHasItems(newItems.length > 0);
}
```

### After: Compute on Render

```typescript
const [items, setItems] = useState<Item[]>([]);
const itemCount = items.length;
const hasItems = items.length > 0;

function addItem(item: Item) {
  setItems((prev) => [...prev, item]);
}
```

---

## Boolean Logic

### Before: Verbose Conditionals

```typescript
if (isActive === true) {
  return true;
} else {
  return false;
}
```

### After: Direct Return

```typescript
return isActive;
```

---

## Array Operations

### Before: Imperative Loop

```typescript
const activeUsers: User[] = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].isActive) {
    activeUsers.push(users[i]);
  }
}
```

### After: Declarative Filter

```typescript
const activeUsers = users.filter((user) => user.isActive);
```

---

## Object Destructuring

### Before: Repeated Access

```typescript
function displayUser(user: User) {
  console.log(user.name);
  console.log(user.email);
  console.log(user.role);
}
```

### After: Destructured

```typescript
function displayUser({ name, email, role }: User) {
  console.log(name);
  console.log(email);
  console.log(role);
}
```

---

## Null Checks

### Before: Verbose Null Handling

```typescript
let displayName: string;
if (user && user.profile && user.profile.displayName) {
  displayName = user.profile.displayName;
} else {
  displayName = 'Anonymous';
}
```

### After: Optional Chaining + Nullish Coalescing

```typescript
const displayName = user?.profile?.displayName ?? 'Anonymous';
```

---

## Function Composition

### Before: Callback Hell

```typescript
fetchUser(id, (user) => {
  fetchOrders(user.id, (orders) => {
    fetchItems(orders[0].id, (items) => {
      render(items);
    });
  });
});
```

### After: Async/Await

```typescript
async function loadUserItems(id: string) {
  const user = await fetchUser(id);
  const orders = await fetchOrders(user.id);
  const items = await fetchItems(orders[0].id);
  render(items);
}
```

---

## Component Props

### Before: Prop Drilling

```typescript
function App({ theme, user, settings }: AppProps) {
  return <Layout theme={theme} user={user} settings={settings} />;
}

function Layout({ theme, user, settings }: LayoutProps) {
  return <Sidebar theme={theme} user={user} settings={settings} />;
}
```

### After: Context or Composition

```typescript
function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Layout />
      </UserProvider>
    </ThemeProvider>
  );
}
```

---

## String Building

### Before: Concatenation

```typescript
const url = baseUrl + '/api/' + version + '/users/' + userId + '/orders';
```

### After: Template Literal

```typescript
const url = `${baseUrl}/api/${version}/users/${userId}/orders`;
```

---

## Switch vs Object Map

### Before: Long Switch

```typescript
function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'yellow';
    case 'active':
      return 'green';
    case 'error':
      return 'red';
    case 'complete':
      return 'blue';
    default:
      return 'gray';
  }
}
```

### After: Object Map (when appropriate)

```typescript
const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  active: 'green',
  error: 'red',
  complete: 'blue',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'gray';
}
```

---

## When NOT to Simplify

Some patterns look "complex" but serve important purposes:

1. **Explicit error handling** - Keep try/catch when errors need specific handling
2. **Type guards** - Keep verbose checks when TypeScript needs them
3. **Performance-critical code** - Keep optimized code even if less readable
4. **Domain-specific logic** - Keep explicit business rules visible
5. **Test setup** - Keep verbose setup for clarity in tests
