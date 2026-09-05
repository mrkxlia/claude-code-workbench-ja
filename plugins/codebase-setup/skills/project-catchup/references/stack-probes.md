# stack-probes — 構成の根拠がどのファイルにあるか（スタック別の逆引き）

`project-catchup` の Step 1 で使う。**該当するスタックの節だけ**を読む（全部読まない）。

各節は「読むファイル」と「そこから確定すること」の2列。**確定すること**の欄が、
レポートのどの章を埋められるかに対応する。ここに挙がっていないスタックのときは、
同じ考え方（宣言ファイル → 実体 → 制限）で入口を探す。

---

## IaC（3章「インフラ構成」の根拠）

### AWS CDK（TypeScript / Python）

| 読むファイル | 確定すること |
|---|---|
| `bin/*.ts`・`app.py` | どの Stack が本番に載っているか（環境ごとの分岐もここ） |
| `lib/*-stack.ts` の `Vpc`・`SubnetConfiguration` | サブネットの公開/非公開、AZ 数 |
| `SecurityGroup` の `addIngressRule` | **何が何に繋がれるか／繋がれないか**。3章で最も価値が高い1行 |
| `FargateService`・`ApplicationLoadBalancedFargateService` | コンテナの実体・ポート・タスク数・ヘルスチェックパス |
| `DatabaseCluster`・`ServerlessCluster` | DB エンジン・バージョン・配置サブネット |
| `Role`・`grant*()` の呼び出し | どのサービスが何に触れるか（IAM の実効権限） |

### Terraform

| 読むファイル | 確定すること |
|---|---|
| `main.tf`・`*.tf` の `resource` 宣言 | リソースの実体 |
| `aws_security_group_rule`・`ingress` ブロック | 通信の許可・拒否 |
| `variables.tf`・`terraform.tfvars`・`env/*.tfvars` | 環境ごとの差分（サイズ・台数・ドメイン） |
| `backend` ブロック | state の置き場（誰が apply しているかの手がかり） |
| `modules/` の呼び出し | 実体はモジュール側にあるので、呼び出し引数から追う |

### CloudFormation / SAM / serverless.yml

| 読むファイル | 確定すること |
|---|---|
| `template.yaml` の `Resources` | リソース一覧 |
| `Events`（SAM）・`functions.*.events`（serverless） | **何が関数を起動するか**（API GW・SQS・EventBridge・cron） |
| `Globals`・`provider` | 共通のランタイム・タイムアウト・環境変数 |

### Kubernetes / Helm

| 読むファイル | 確定すること |
|---|---|
| `Deployment`・`StatefulSet` | コンテナ・レプリカ数・イメージ |
| `Service`・`Ingress` | 外からの入口とルーティング規則 |
| `NetworkPolicy` | Pod 間で**繋がれない**経路（無ければ全通し。それも書く） |
| `ConfigMap`・`Secret`・`ExternalSecret` | 設定とシークレットの所在（7章） |
| `values.yaml`・`values-*.yaml` | 環境ごとの差分 |

### docker-compose（ローカル環境。7章の根拠）

| 読むファイル | 確定すること |
|---|---|
| `services.*.image`・`build` | ローカルで何が上がるか |
| `ports`・`depends_on` | ポート衝突と起動順の前提 |
| `volumes` | データが消えるか残るか（初期化手順の前提） |

---

## リクエストの通り道（4章の根拠）

**探し方の型は共通** — ①ルーティング定義 → ②グローバルに登録された中間処理 → ③ハンドラ個別の装飾。
②を見落とすと「どこで認証しているか分からない」レポートになる。

| フレームワーク | ①ルーティング | ②グローバル登録 | ③個別 |
|---|---|---|---|
| NestJS | `*.controller.ts` のデコレータ | `main.ts` の `useGlobalGuards`/`Pipes`/`Filters`、`*.module.ts` の `APP_GUARD` | `@UseGuards()`・`@Public()` 等の自作デコレータ |
| Express / Fastify | `routes/`・`app.use('/path', router)` | `app.use(...)` の**登録順**がそのまま実行順 | ルート定義の途中に挟むミドルウェア |
| Rails | `config/routes.rb` | `ApplicationController` の `before_action` | 各コントローラの `before_action ..., only:` |
| Django | `urls.py` | `settings.py` の `MIDDLEWARE`（順序が意味を持つ） | デコレータ・DRF の `permission_classes` |
| Spring Boot | `@RestController`・`@RequestMapping` | `SecurityFilterChain`・`WebMvcConfigurer` の `Interceptor` | `@PreAuthorize`・`@Secured` |
| Laravel | `routes/*.php` | `app/Http/Kernel.php` の `$middleware`・`$middlewareGroups` | ルートの `->middleware()` |
| Go（chi・echo・gin） | ルータ組み立て箇所 | `r.Use(...)` の登録順 | グループごとの `Use` |

**必ず確認する2点**:

- **順序**（先に何が走るか）— 4章の図はこの順序そのもの
- **素通りする条件**（公開エンドポイントの指定方法）— ここが分岐として図に出る

---

## データモデル（5章の根拠）

| スタック | 読むファイル | 注意 |
|---|---|---|
| Prisma | `prisma/schema.prisma` | ここが唯一の正。`migrations/` は履歴 |
| TypeORM | `entity/*.ts`・`*.entity.ts` | `synchronize: true` だと本番スキーマが宣言とずれる |
| Sequelize | `models/*.js`・`migrations/` | モデルとマイグレーションの二重管理でずれることがある |
| ActiveRecord | `db/schema.rb`（無ければ `structure.sql`） | **モデルクラスにカラム定義は無い**。schema.rb が実体 |
| Django ORM | `models.py`・`migrations/` | `choices` に区分値の意味がある |
| SQLAlchemy / Alembic | `models.py`・`alembic/versions/` | 最新の head を辿る |
| Flyway / Liquibase | `db/migration/V*.sql`・`changelog` | 累積。**最終形は SQL を積み上げて読む**か、実 DB から取る |
| 素の SQL | `schema.sql`・`ddl/` | 適用されているか CI・手順書で確認する |

区分値（enum・ステータス・role）は、**定義箇所と、それを分岐に使っている箇所の両方**を読む。
定義だけでは「MANAGER だと何ができるか」が書けない。

---

## 認証・認可（4章と5章にまたがる）

| 方式 | 読むファイル | 確定すること |
|---|---|---|
| Amazon Cognito | IaC の `UserPool`・`UserPoolClient`、アプリ側の JWT 検証 | **アプリ側のユーザーテーブルとの照合キー**（`sub` か `email` か）。ここがレポートで一番効く |
| Auth0 / Okta | `.env` の domain・audience、JWT ミドルウェア | カスタムクレームの名前空間 |
| Firebase Auth | `firebase.json`・Admin SDK の初期化 | ID トークンの検証箇所 |
| 自前 JWT | 署名・検証のユーティリティ | 有効期限・リフレッシュの有無・失効の仕組み |
| セッション（Cookie） | セッションストア設定 | 保存先（Redis・DB）とスケール時の前提 |

認可は「役割の定義」より「**役割で分岐している箇所**」を探す。`if (role === ...)`・
`@PreAuthorize`・ポリシークラスを grep する。

---

## デプロイ・CI/CD（7章の根拠）

| スタック | 読むファイル | 確定すること |
|---|---|---|
| GitHub Actions | `.github/workflows/*.yml` | `on:` が**デプロイ契機**。`environment:` があれば手動承認ゲート |
| CodePipeline / CodeBuild | IaC の Pipeline 定義・`buildspec.yml` | 段階と承認アクション |
| GitLab CI | `.gitlab-ci.yml` | `when: manual` が手動ゲート |
| Argo CD / Flux | `Application`・`Kustomization` | どのブランチ・パスが同期対象か（GitOps は push 契機ではない） |

シークレットの所在（7章の表）は、CI の `secrets.*` 参照名と、実行時の取得元
（Secrets Manager・SSM・Vault・環境変数）の**両方**を書く。値は書かない。
