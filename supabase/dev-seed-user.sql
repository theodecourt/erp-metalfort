-- Dev-only: create admin user. Never run in production.
-- Password: metalfort2026!
do $$
declare
  admin_uid uuid := gen_random_uuid();
begin
  if not exists (select 1 from auth.users where email = 'admin@metalfort.tech') then
    insert into auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, aud, role,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      created_at, updated_at
    ) values (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'admin@metalfort.tech',
      crypt('metalfort2026!', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'sub', admin_uid::text,
        'email', 'admin@metalfort.tech',
        'email_verified', true,
        'phone_verified', false,
        'nome', 'Admin Dev'
      ),
      '{"provider":"email","providers":["email"]}'::jsonb,
      'authenticated',
      'authenticated',
      '', '', '', '',
      now(),
      now()
    );

    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(),
      admin_uid::text,
      admin_uid,
      jsonb_build_object(
        'sub', admin_uid::text,
        'email', 'admin@metalfort.tech',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    );
  end if;

  insert into usuario_interno (id, nome, role, ativo)
  select id, 'Admin Dev', 'admin', true from auth.users where email='admin@metalfort.tech'
  on conflict (id) do nothing;
end $$;
