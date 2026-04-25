export const ErrorScreen = ({ message }: { message: string }) => (
  <div className="center-screen">
    <div className="ui-card center-card">
      <h1>Не удалось открыть приложение</h1>
      <p>{message}</p>
      <p className="error-hint">Для демо-режима откройте страницу с параметром `?demo=1`.</p>
    </div>
  </div>
);
