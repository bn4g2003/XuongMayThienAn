# Copilot Coding Rules for Ant Design v6 + Next.js App Router

## Required rules

1. Always wrap the application in `<App>` from `antd`.
2. Never use static AntD APIs: message.success(), notification.error(),
   Modal.confirm(), etc.
3. Always use App.useApp() to access message, notification, modal.
4. Every file using App.useApp() must start with: "use client".
5. Always generate code like: const { message, notification, modal } =
   App.useApp()
6. Use AntD v6 APIs only (size="default" | "small"; modal via modal.confirm();
   no deprecated props).
7. Prefer new token-based theming: <ConfigProvider
   theme={{ token: { ... }}}></ConfigProvider>
8. Never generate @ant-design/nextjs-registry import or usage.
9. When using AntD components inside Next.js app router, ensure components are
   marked as client components.
10. Always follow AntD v6 code style & component API.

## Examples Copilot must follow:

- message: const { message } = App.useApp(); message.success("Saved!");

- notification: const { notification } = App.useApp(); notification.error({
  message: "Error", description: "Invalid input" });

- modal: const { modal } = App.useApp(); modal.confirm({ title: "Confirm",
  onOk() {}});
