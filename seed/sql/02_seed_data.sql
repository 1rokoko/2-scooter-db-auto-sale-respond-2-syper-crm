INSERT INTO motorcycles (title, description, price, currency, availability, location, media)
VALUES
  ('Yamaha MT-07 2024', 'Low mileage, advanced ABS, AI service history available.', 7200.00, 'USD', 'available', 'San Francisco, CA', JSON_ARRAY('https://example.com/img/mt07.jpg')),
  ('BMW R1250GS Adventure', 'Full adventure setup with panniers and smart navigation.', 18900.00, 'USD', 'available', 'Portland, OR', JSON_ARRAY('https://example.com/img/gs1250.jpg')),
  ('Zero SR/F Premium', 'Electric performance bike with fast charging and AI telemetry.', 16400.00, 'USD', 'reserved', 'Los Angeles, CA', JSON_ARRAY('https://example.com/img/zerosrf.jpg'));

INSERT INTO clients (full_name, phone, email, channel, status, metadata)
VALUES
  ('Alex Rider', '+14155550100', 'alex@example.com', 'whatsapp', 'engaged', JSON_OBJECT('preferred_model','Yamaha MT-07', 'budget','7500')),
  ('Kim Taylor', '+14155550101', 'kim@example.com', 'telegram', 'hot', JSON_OBJECT('preferred_model','BMW R1250GS', 'test_ride','scheduled')),
  ('Jordan Blake', '+14155550102', 'jordan@example.com', 'website', 'new', JSON_OBJECT('utm_source','google_ads'));

INSERT INTO deals (client_id, motorcycle_id, stage, amount, currency, expected_close, notes)
VALUES
  (1, 1, 'negotiation', 7200.00, 'USD', CURRENT_DATE + INTERVAL 7 DAY, 'Requested AI bot to send financing options.'),
  (2, 2, 'invoice', 18900.00, 'USD', CURRENT_DATE + INTERVAL 3 DAY, 'Needs concierge delivery scheduling.'),
  (3, NULL, 'research', NULL, 'USD', NULL, 'Needs to pick a model, follow-up scheduled.');

INSERT INTO reminders (deal_id, remind_at, channel, payload)
VALUES
  (1, CURRENT_TIMESTAMP + INTERVAL 1 DAY, 'whatsapp', JSON_OBJECT('template','follow_up', 'language','en')),
  (2, CURRENT_TIMESTAMP + INTERVAL 2 DAY, 'telegram', JSON_OBJECT('template','invoice_payment', 'language','en')),
  (3, CURRENT_TIMESTAMP + INTERVAL 12 HOUR, 'email', JSON_OBJECT('template','nudge', 'language','en'));
