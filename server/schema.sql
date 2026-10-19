-- ほどけない オンラインランキング（Supabase の SQL Editor に supabase.sql を貼って実行。何度実行しても大丈夫）
-- このファイル(schema.sql)は元データ。supabase.sql は build_web.py が禁止語リストを足して作ります。
-- 各プレイヤー（端末）の、レベルごとの最速タイムだけを保存します。

create table if not exists public.scores (
  level      text        not null check (level ~ '^L[0-9]{1,3}$'),
  player     uuid        not null,                       -- 端末ごとのランダムID（個人情報ではない）
  name       text        not null check (char_length(name) between 1 and 12),
  ms         integer     not null check (ms between 5000 and 86400000), -- 5秒未満はありえないので弾く
  updated_at timestamptz not null default now(),
  primary key (level, player)
);
create index if not exists scores_level_ms on public.scores (level, ms);

alter table public.scores enable row level security;

-- 誰でもランキングを読める（名前とタイムだけ）。直接の書き込みは不可。
drop policy if exists "read scores" on public.scores;
create policy "read scores" on public.scores for select using (true);

-- 記録の登録はこの関数経由だけ。自己ベストより遅いタイムは上書きしない。
-- banned words for names, matched after the same normalization the game uses
create table if not exists public.ng_words (word text primary key, exact boolean not null default false);
alter table public.ng_words enable row level security;

create or replace function public.norm_name(s text) returns text language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             translate(
               translate(lower(normalize(s, NFKC)),
                 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ',
                 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ'),
               '0134578@$!|', 'oieastbasii'),
             '[^[:alnum:]ぁ-ゖ一-龯가-힣]', '', 'g'),
           '(.)\1+', '\1', 'g');
$$;

create or replace function public.name_allowed(s text) returns boolean language sql stable as $$
  select norm_name(s) <> ''
     and not exists (select 1 from ng_words w
                     where (w.exact and norm_name(s) = norm_name(w.word))
                        or (not w.exact and position(norm_name(w.word) in norm_name(s)) > 0));
$$;

create or replace function public.submit_score(p_level text, p_player uuid, p_name text, p_ms integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  best integer;
  r integer;
  total integer;
begin
  p_name := btrim(regexp_replace(p_name, '\s+', ' ', 'g'));
  if not name_allowed(p_name) then
    raise exception 'name_rejected';
  end if;
  insert into scores as s (level, player, name, ms)
  values (p_level, p_player, p_name, p_ms)
  on conflict (level, player) do update
    set ms = least(s.ms, excluded.ms),
        name = excluded.name,
        updated_at = case when excluded.ms < s.ms then now() else s.updated_at end;
  select ms into best from scores where level = p_level and player = p_player;
  select count(*) + 1 into r from scores where level = p_level and ms < best;
  select count(*) into total from scores where level = p_level;
  return json_build_object('rank', r, 'total', total, 'best', best);
end;
$$;

revoke all on function public.submit_score(text, uuid, text, integer) from public;
grant execute on function public.submit_score(text, uuid, text, integer) to anon;
