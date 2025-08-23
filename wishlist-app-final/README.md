# M & N Wishlist (Final)
- PIN хамгаалалт (сонголтоор)
- Зураг upload (/uploads/... proxy)
- CSV экспорт/импорт, DB нөөц — нэг цэсэнд
- Munhu / Nomuna ялгалт
- MN UI, Dark/Light
- SQLite volume

## Run
```bash
docker compose down
docker compose up --build
```
Open: http://localhost:8080

## Enable PIN
docker-compose.yml → backend.environment:
```
- AUTH_PIN=1234
```
