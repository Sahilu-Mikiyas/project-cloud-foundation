-- Give each department its own useful browse facets and seed a broad preview
-- catalog. These are examples only; the previous migration's database guard
-- continues to prevent catalog samples from becoming orders.
alter table public.categories
  add column filter_definitions jsonb not null default '[]'::jsonb;

alter table public.products
  add column catalog_attributes jsonb not null default '{}'::jsonb;

insert into public.categories (slug, name, sort_order, filter_definitions) values
  ('electronics', 'Electronics', 13, '[{"key":"device_type","label":"Device type","options":["Audio","Camera","Smart home"]},{"key":"connectivity","label":"Connectivity","options":["Bluetooth","USB-C","Wi-Fi"]}]'),
  ('jewelry', 'Jewelry', 13, '[{"key":"material","label":"Material","options":["Gold vermeil","Silver","Stainless steel"]},{"key":"style","label":"Style","options":["Classic","Minimal","Statement"]}]'),
  ('furniture', 'Furniture', 14, '[{"key":"room","label":"Room","options":["Bedroom","Living room","Office"]},{"key":"material","label":"Material","options":["Oak","Rattan","Solid wood"]}]'),
  ('food-pantry', 'Food & Pantry', 15, '[{"key":"origin","label":"Origin","options":["Ethiopia","Japan","Türkiye"]},{"key":"dietary","label":"Dietary","options":["Gluten-free","Plant-based","Vegan"]}]'),
  ('health-wellness', 'Health & Wellness', 16, '[{"key":"concern","label":"Focus","options":["Relaxation","Sleep","Wellbeing"]},{"key":"format","label":"Format","options":["Oil","Set","Topical"]}]'),
  ('travel', 'Travel', 17, '[{"key":"luggage_type","label":"Travel type","options":["Carry-on","Day trip","Weekender"]},{"key":"capacity","label":"Capacity","options":["Compact","Medium","Large"]}]'),
  ('art-collectibles', 'Art & Collectibles', 18, '[{"key":"medium","label":"Medium","options":["Ceramic","Print","Textile"]},{"key":"style","label":"Style","options":["Contemporary","Traditional"]}]')
on conflict (slug) do update set filter_definitions = excluded.filter_definitions;

update public.categories set filter_definitions = case slug
  when 'fragrance' then '[{"key":"scent_family","label":"Scent family","options":["Amber & oud","Floral","Fresh"]},{"key":"format","label":"Format","options":["Eau de parfum","Set","Travel size"]}]'::jsonb
  when 'fashion' then '[{"key":"size","label":"Size","options":["One size","S","M","L"]},{"key":"color","label":"Color","options":["Black","Blue","Cream","Green"]},{"key":"material","label":"Material","options":["Cotton","Leather","Linen"]}]'::jsonb
  when 'watches' then '[{"key":"movement","label":"Movement","options":["Automatic","Quartz"]},{"key":"strap","label":"Strap","options":["Leather","Steel"]},{"key":"style","label":"Style","options":["Classic","Minimal"]}]'::jsonb
  when 'electronics' then '[{"key":"device_type","label":"Device type","options":["Audio","Camera","Smart home"]},{"key":"connectivity","label":"Connectivity","options":["Bluetooth","USB-C","Wi-Fi"]}]'::jsonb
  when 'home-living' then '[{"key":"material","label":"Material","options":["Cotton","Natural fiber","Oak","Rattan"]},{"key":"room","label":"Room","options":["Bedroom","Living room","Any room"]}]'::jsonb
  when 'beauty-personal-care' then '[{"key":"skin_type","label":"Skin type","options":["All skin types","Dry","Sensitive"]},{"key":"concern","label":"Focus","options":["Hydration","Nourishing","Routine"]}]'::jsonb
  when 'kitchen-dining' then '[{"key":"material","label":"Material","options":["Ceramic","Glass","Stainless steel"]},{"key":"use","label":"Use","options":["Coffee & tea","Dining","Storage"]}]'::jsonb
  when 'footwear' then '[{"key":"size","label":"Size","options":["38","39","40","41","42"]},{"key":"material","label":"Material","options":["Canvas","Leather","Suede"]}]'::jsonb
  when 'bags-accessories' then '[{"key":"material","label":"Material","options":["Canvas","Leather","Woven"]},{"key":"use","label":"Use","options":["Everyday","Travel","Work"]}]'::jsonb
  when 'sports-outdoors' then '[{"key":"activity","label":"Activity","options":["Fitness","Hiking","Travel"]},{"key":"material","label":"Material","options":["Aluminum","Recycled fabric","Stainless steel"]}]'::jsonb
  when 'kids-toys' then '[{"key":"age_range","label":"Age","options":["3–5 years","6–8 years","All ages"]},{"key":"material","label":"Material","options":["Wood","Cotton","Recycled paper"]}]'::jsonb
  when 'gifts-stationery' then '[{"key":"occasion","label":"Occasion","options":["Celebration","Everyday","Thank you"]},{"key":"format","label":"Format","options":["Journal","Set","Writing"]}]'::jsonb
  else filter_definitions
end
where slug in ('fragrance','fashion','watches','electronics','home-living','beauty-personal-care','kitchen-dining','footwear','bags-accessories','sports-outdoors','kids-toys','gifts-stationery');

update public.products set catalog_attributes = case slug
  when 'oud-noir-eau-de-parfum' then '{"scent_family":"Amber & oud","format":"Eau de parfum"}'::jsonb
  when 'wireless-studio-headphones' then '{"device_type":"Audio","connectivity":"Bluetooth"}'::jsonb
  when 'leather-weekender-bag' then '{"size":"One size","color":"Neutral","material":"Leather"}'::jsonb
  when 'classic-steel-chronograph' then '{"movement":"Quartz","strap":"Steel","style":"Classic"}'::jsonb
  else catalog_attributes
end
where slug in ('oud-noir-eau-de-parfum','wireless-studio-headphones','leather-weekender-bag','classic-steel-chronograph');

-- Existing examples get representative imagery and filter values too.
update public.products set
  image_url = case slug
    when 'sample-jaipur-block-print-cushion-covers' then 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85'
    when 'sample-grasse-botanical-care-set' then 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=85'
    when 'sample-kyoto-ceramic-tea-set' then 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1000&q=85'
    when 'sample-florence-leather-loafers' then 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=85'
    when 'sample-istanbul-woven-market-tote' then 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85'
    when 'sample-nairobi-sisal-storage-basket' then 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85'
    when 'sample-alpine-insulated-travel-bottle' then 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=85'
    when 'sample-berlin-wooden-building-set' then 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1000&q=85'
    when 'sample-london-journal-gift-set' then 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=85'
    else image_url
  end,
  catalog_attributes = case slug
    when 'sample-jaipur-block-print-cushion-covers' then '{"material":"Cotton","room":"Living room"}'::jsonb
    when 'sample-grasse-botanical-care-set' then '{"skin_type":"All skin types","concern":"Routine"}'::jsonb
    when 'sample-kyoto-ceramic-tea-set' then '{"material":"Ceramic","use":"Coffee & tea"}'::jsonb
    when 'sample-florence-leather-loafers' then '{"size":"40","material":"Leather"}'::jsonb
    when 'sample-istanbul-woven-market-tote' then '{"material":"Woven","use":"Everyday"}'::jsonb
    when 'sample-nairobi-sisal-storage-basket' then '{"material":"Natural fiber","room":"Any room"}'::jsonb
    when 'sample-alpine-insulated-travel-bottle' then '{"activity":"Travel","material":"Stainless steel"}'::jsonb
    when 'sample-berlin-wooden-building-set' then '{"age_range":"6–8 years","material":"Wood"}'::jsonb
    when 'sample-london-journal-gift-set' then '{"occasion":"Everyday","format":"Journal"}'::jsonb
    else catalog_attributes
  end
where slug like 'sample-%';

-- Additional preview items: three distinct products in every department.
-- JSON is used as a compact, reviewable fixture list. No row is a live seller offer.
with catalog as (
  select * from jsonb_to_recordset($items$[
    {"slug":"sample-home-linen-throw","name":"Washed Linen Throw","brand":"Atelier Home","category":"home-living","image":"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85","price":485000,"region":"europe","country":"Portugal","city":"Porto","attributes":{"material":"Cotton","room":"Living room"}},
    {"slug":"sample-home-rattan-lamp","name":"Rattan Table Lamp","brand":"Casa Forma","category":"home-living","image":"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85","price":735000,"region":"asia","country":"Indonesia","city":"Bali","attributes":{"material":"Rattan","room":"Bedroom"}},
    {"slug":"sample-beauty-rose-face-oil","name":"Rose & Squalane Face Oil","brand":"Botanique","category":"beauty-personal-care","image":"https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=1000&q=85","price":295000,"region":"europe","country":"France","city":"Grasse","attributes":{"skin_type":"Dry","concern":"Hydration"}},
    {"slug":"sample-beauty-citrus-care-kit","name":"Citrus Daily Care Kit","brand":"Verde Studio","category":"beauty-personal-care","image":"https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=1000&q=85","price":365000,"region":"asia","country":"South Korea","city":"Seoul","attributes":{"skin_type":"Sensitive","concern":"Routine"}},
    {"slug":"sample-kitchen-glass-carafe","name":"Handblown Glass Carafe","brand":"Mizu Table","category":"kitchen-dining","image":"https://images.unsplash.com/photo-1513558161293-cdaf765edfd7?auto=format&fit=crop&w=1000&q=85","price":395000,"region":"europe","country":"Czechia","city":"Prague","attributes":{"material":"Glass","use":"Dining"}},
    {"slug":"sample-kitchen-steel-coffee-set","name":"Stainless Coffee Pour-over Set","brand":"Northstar Goods","category":"kitchen-dining","image":"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85","price":560000,"region":"asia","country":"Japan","city":"Osaka","attributes":{"material":"Stainless steel","use":"Coffee & tea"}},
    {"slug":"sample-footwear-canvas-sneakers","name":"Everyday Canvas Sneakers","brand":"Common Ground","category":"footwear","image":"https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1000&q=85","price":620000,"region":"asia","country":"Vietnam","city":"Ho Chi Minh City","attributes":{"size":"39","material":"Canvas"}},
    {"slug":"sample-footwear-suede-mules","name":"Soft Suede Weekend Mules","brand":"Forma","category":"footwear","image":"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=85","price":790000,"region":"europe","country":"Spain","city":"Alicante","attributes":{"size":"41","material":"Suede"}},
    {"slug":"sample-bags-leather-crossbody","name":"Compact Leather Crossbody","brand":"Morrow","category":"bags-accessories","image":"https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85","price":895000,"region":"europe","country":"Italy","city":"Milan","attributes":{"material":"Leather","use":"Everyday"}},
    {"slug":"sample-bags-canvas-weekender","name":"Canvas Weekender Bag","brand":"Field Notes","category":"bags-accessories","image":"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85","price":720000,"region":"north_america","country":"United States","city":"Portland","attributes":{"material":"Canvas","use":"Travel"}},
    {"slug":"sample-sports-hiking-bottle","name":"Trail-ready Steel Bottle","brand":"Summit Supply","category":"sports-outdoors","image":"https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=85","price":245000,"region":"europe","country":"Switzerland","city":"Zurich","attributes":{"activity":"Hiking","material":"Stainless steel"}},
    {"slug":"sample-sports-training-duffel","name":"Recycled Training Duffel","brand":"Open Air","category":"sports-outdoors","image":"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85","price":570000,"region":"asia","country":"Japan","city":"Tokyo","attributes":{"activity":"Fitness","material":"Recycled fabric"}},
    {"slug":"sample-kids-wooden-puzzle","name":"Woodland Wooden Puzzle","brand":"Little Grove","category":"kids-toys","image":"https://images.unsplash.com/photo-1560961911-ba7ef651a56c?auto=format&fit=crop&w=1000&q=85","price":310000,"region":"europe","country":"Germany","city":"Berlin","attributes":{"age_range":"3–5 years","material":"Wood"}},
    {"slug":"sample-kids-cotton-play-mat","name":"Quilted Cotton Play Mat","brand":"Soft Start","category":"kids-toys","image":"https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1000&q=85","price":670000,"region":"asia","country":"India","city":"Jaipur","attributes":{"age_range":"All ages","material":"Cotton"}},
    {"slug":"sample-gifts-letter-writing-set","name":"Letter Writing Gift Set","brand":"Paper & Post","category":"gifts-stationery","image":"https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=85","price":225000,"region":"europe","country":"United Kingdom","city":"London","attributes":{"occasion":"Thank you","format":"Writing"}},
    {"slug":"sample-gifts-ceramic-vase","name":"Small Artisan Bud Vase","brand":"Sunday Objects","category":"gifts-stationery","image":"https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1000&q=85","price":285000,"region":"asia","country":"Japan","city":"Kyoto","attributes":{"occasion":"Celebration","format":"Set"}},
    {"slug":"sample-apparel-linen-shirt","name":"Relaxed Linen Shirt","brand":"Common Ground","category":"fashion","image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=85","price":640000,"region":"europe","country":"Portugal","city":"Lisbon","attributes":{"size":"M","color":"Cream","material":"Linen"}},
    {"slug":"sample-apparel-cotton-knit","name":"Textured Cotton Knit","brand":"Northline","category":"fashion","image":"https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1000&q=85","price":585000,"region":"asia","country":"Japan","city":"Tokyo","attributes":{"size":"L","color":"Blue","material":"Cotton"}},
    {"slug":"sample-electronics-wireless-earbuds","name":"Everyday Wireless Earbuds","brand":"Auralis","category":"electronics","image":"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=1000&q=85","price":850000,"region":"asia","country":"South Korea","city":"Seoul","attributes":{"device_type":"Audio","connectivity":"Bluetooth"}},
    {"slug":"sample-electronics-smart-lamp","name":"Connected Ambient Lamp","brand":"Brightform","category":"electronics","image":"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85","price":695000,"region":"europe","country":"Netherlands","city":"Eindhoven","attributes":{"device_type":"Smart home","connectivity":"Wi-Fi"}},
    {"slug":"sample-jewelry-silver-hoops","name":"Sculpted Silver Hoops","brand":"Morrow Studio","category":"jewelry","image":"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85","price":480000,"region":"europe","country":"Italy","city":"Florence","attributes":{"material":"Silver","style":"Minimal"}},
    {"slug":"sample-jewelry-gold-pendant","name":"Gold Vermeil Pendant","brand":"Lumen Objects","category":"jewelry","image":"https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1000&q=85","price":735000,"region":"asia","country":"Thailand","city":"Bangkok","attributes":{"material":"Gold vermeil","style":"Classic"}},
    {"slug":"sample-furniture-oak-side-table","name":"Compact Oak Side Table","brand":"Casa Forma","category":"furniture","image":"https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=1000&q=85","price":1980000,"region":"europe","country":"Denmark","city":"Copenhagen","attributes":{"room":"Living room","material":"Oak"}},
    {"slug":"sample-furniture-rattan-chair","name":"Woven Rattan Lounge Chair","brand":"Atelier Home","category":"furniture","image":"https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=1000&q=85","price":2450000,"region":"asia","country":"Indonesia","city":"Bali","attributes":{"room":"Living room","material":"Rattan"}},
    {"slug":"sample-food-ethiopian-coffee","name":"Highland Single-origin Coffee","brand":"Origin House","category":"food-pantry","image":"https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1000&q=85","price":185000,"region":"africa","country":"Ethiopia","city":"Yirgacheffe","attributes":{"origin":"Ethiopia","dietary":"Plant-based"}},
    {"slug":"sample-food-matcha-kit","name":"Ceremonial Matcha Starter Kit","brand":"Mizu Table","category":"food-pantry","image":"https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=1000&q=85","price":420000,"region":"asia","country":"Japan","city":"Uji","attributes":{"origin":"Japan","dietary":"Vegan"}},
    {"slug":"sample-wellness-bath-ritual","name":"Botanical Bath Ritual Set","brand":"Verde Studio","category":"health-wellness","image":"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=85","price":390000,"region":"europe","country":"France","city":"Provence","attributes":{"concern":"Relaxation","format":"Set"}},
    {"slug":"sample-wellness-aromatherapy-oil","name":"Calm Evening Aromatherapy Oil","brand":"Still & Co","category":"health-wellness","image":"https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=85","price":255000,"region":"asia","country":"India","city":"Mysuru","attributes":{"concern":"Sleep","format":"Oil"}},
    {"slug":"sample-travel-leather-passport-wallet","name":"Leather Passport Wallet","brand":"Field Notes","category":"travel","image":"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85","price":445000,"region":"europe","country":"Italy","city":"Milan","attributes":{"luggage_type":"Day trip","capacity":"Compact"}},
    {"slug":"sample-travel-weekender-case","name":"Structured Weekender Case","brand":"Morrow","category":"travel","image":"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85","price":1270000,"region":"north_america","country":"United States","city":"New York","attributes":{"luggage_type":"Weekender","capacity":"Large"}},
    {"slug":"sample-art-indigo-wall-print","name":"Indigo Botanical Art Print","brand":"Paper & Post","category":"art-collectibles","image":"https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1000&q=85","price":335000,"region":"asia","country":"India","city":"Jaipur","attributes":{"medium":"Print","style":"Contemporary"}},
    {"slug":"sample-art-hand-thrown-vessel","name":"Hand-thrown Stoneware Vessel","brand":"Sunday Objects","category":"art-collectibles","image":"https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1000&q=85","price":620000,"region":"europe","country":"Portugal","city":"Porto","attributes":{"medium":"Ceramic","style":"Traditional"}},
    {"slug":"sample-home-woven-wall-hanging","name":"Handwoven Wall Hanging","brand":"Atelier Home","category":"home-living","image":"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85","price":525000,"region":"africa","country":"Ethiopia","city":"Addis Ababa","attributes":{"material":"Natural fiber","room":"Living room"}},
    {"slug":"sample-beauty-hydration-routine","name":"Hydration Ritual Trio","brand":"Botanique","category":"beauty-personal-care","image":"https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=1000&q=85","price":450000,"region":"asia","country":"South Korea","city":"Seoul","attributes":{"skin_type":"All skin types","concern":"Hydration"}},
    {"slug":"sample-kitchen-stoneware-dinner-set","name":"Speckled Stoneware Dinner Set","brand":"Mizu Table","category":"kitchen-dining","image":"https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1000&q=85","price":890000,"region":"europe","country":"Portugal","city":"Porto","attributes":{"material":"Ceramic","use":"Dining"}},
    {"slug":"sample-footwear-leather-sandals","name":"Minimal Leather Sandals","brand":"Forma","category":"footwear","image":"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=85","price":690000,"region":"middle_east","country":"Türkiye","city":"Istanbul","attributes":{"size":"38","material":"Leather"}},
    {"slug":"sample-bags-woven-market-bag","name":"Woven Market Carryall","brand":"Sunday Objects","category":"bags-accessories","image":"https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85","price":360000,"region":"africa","country":"Kenya","city":"Nairobi","attributes":{"material":"Woven","use":"Everyday"}},
    {"slug":"sample-sports-recycled-yoga-mat","name":"Recycled Travel Yoga Mat","brand":"Open Air","category":"sports-outdoors","image":"https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=1000&q=85","price":495000,"region":"asia","country":"India","city":"Rishikesh","attributes":{"activity":"Fitness","material":"Recycled fabric"}},
    {"slug":"sample-kids-cotton-story-dolls","name":"Cotton Storytime Dolls","brand":"Little Grove","category":"kids-toys","image":"https://images.unsplash.com/photo-1560961911-ba7ef651a56c?auto=format&fit=crop&w=1000&q=85","price":355000,"region":"africa","country":"Ghana","city":"Accra","attributes":{"age_range":"3–5 years","material":"Cotton"}},
    {"slug":"sample-gifts-journal-and-pen","name":"Linen Journal & Brass Pen","brand":"Paper & Post","category":"gifts-stationery","image":"https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1000&q=85","price":285000,"region":"europe","country":"United Kingdom","city":"London","attributes":{"occasion":"Celebration","format":"Journal"}},
    {"slug":"sample-apparel-cotton-overshirt","name":"Everyday Cotton Overshirt","brand":"Northline","category":"fashion","image":"https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=85","price":780000,"region":"asia","country":"Japan","city":"Osaka","attributes":{"size":"L","color":"Green","material":"Cotton"}},
    {"slug":"sample-electronics-bluetooth-speaker","name":"Portable Bluetooth Speaker","brand":"Auralis","category":"electronics","image":"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1000&q=85","price":980000,"region":"europe","country":"Germany","city":"Berlin","attributes":{"device_type":"Audio","connectivity":"Bluetooth"}},
    {"slug":"sample-jewelry-steel-cuff","name":"Brushed Steel Cuff Bracelet","brand":"Lumen Objects","category":"jewelry","image":"https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1000&q=85","price":395000,"region":"asia","country":"Thailand","city":"Bangkok","attributes":{"material":"Stainless steel","style":"Statement"}},
    {"slug":"sample-furniture-oak-stool","name":"Hand-finished Oak Stool","brand":"Casa Forma","category":"furniture","image":"https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1000&q=85","price":1120000,"region":"europe","country":"Denmark","city":"Copenhagen","attributes":{"room":"Office","material":"Oak"}},
    {"slug":"sample-food-spice-gift-box","name":"Global Spice Discovery Box","brand":"Origin House","category":"food-pantry","image":"https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85","price":320000,"region":"middle_east","country":"Türkiye","city":"Gaziantep","attributes":{"origin":"Türkiye","dietary":"Vegan"}},
    {"slug":"sample-wellness-sleep-set","name":"Gentle Sleep-time Set","brand":"Still & Co","category":"health-wellness","image":"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1000&q=85","price":430000,"region":"europe","country":"France","city":"Grasse","attributes":{"concern":"Sleep","format":"Topical"}},
    {"slug":"sample-travel-carry-on-organizer","name":"Carry-on Packing Organizer Set","brand":"Field Notes","category":"travel","image":"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85","price":550000,"region":"asia","country":"Japan","city":"Tokyo","attributes":{"luggage_type":"Carry-on","capacity":"Medium"}},
    {"slug":"sample-art-woven-table-runner","name":"Handwoven Table Runner","brand":"Atelier Home","category":"art-collectibles","image":"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85","price":475000,"region":"africa","country":"Ethiopia","city":"Addis Ababa","attributes":{"medium":"Textile","style":"Traditional"}}
    ,{"slug":"sample-fragrance-rose-extrait","name":"Rose & Saffron Eau de Parfum","brand":"Maison Éclat","category":"fragrance","image":"https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85","price":980000,"region":"europe","country":"France","city":"Grasse","attributes":{"scent_family":"Floral","format":"Eau de parfum"}}
    ,{"slug":"sample-fragrance-oud-discovery","name":"Oud Discovery Collection","brand":"Scent Atlas","category":"fragrance","image":"https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85","price":1120000,"region":"middle_east","country":"United Arab Emirates","city":"Dubai","attributes":{"scent_family":"Amber & oud","format":"Set"}}
    ,{"slug":"sample-fashion-cotton-day-dress","name":"Cotton Day Dress","brand":"Common Ground","category":"fashion","image":"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85","price":720000,"region":"asia","country":"India","city":"Jaipur","attributes":{"size":"M","color":"Blue","material":"Cotton"}}
    ,{"slug":"sample-fashion-leather-belt","name":"Hand-finished Leather Belt","brand":"Morrow","category":"fashion","image":"https://images.unsplash.com/photo-1624222247344-550fb8b029d7?auto=format&fit=crop&w=1000&q=85","price":375000,"region":"europe","country":"Italy","city":"Florence","attributes":{"size":"One size","color":"Black","material":"Leather"}}
    ,{"slug":"sample-watches-automatic-dress-watch","name":"Automatic Dress Watch","brand":"Meridian","category":"watches","image":"https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=85","price":5850000,"region":"europe","country":"Switzerland","city":"Geneva","attributes":{"movement":"Automatic","strap":"Leather","style":"Classic"}}
    ,{"slug":"sample-watches-minimal-steel-watch","name":"Minimal Steel Watch","brand":"Northline","category":"watches","image":"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85","price":2680000,"region":"asia","country":"Japan","city":"Tokyo","attributes":{"movement":"Quartz","strap":"Steel","style":"Minimal"}}
  ]$items$::jsonb) as x(
    slug text, name text, brand text, category text, image text, price bigint,
    region text, country text, city text, attributes jsonb
  )
)
insert into public.products (
  slug, name, brand, description, category_id, image_url, price_etb_cents,
  deposit_percent, delivery_days, is_published, listing_type,
  market_region, market_country, market_city, is_catalog_sample, catalog_attributes
)
select c.slug, c.name, c.brand,
  'Illustrative catalog preview. This is not a live offer; the displayed ETB price and delivery estimate are examples for browsing only.',
  cat.id, c.image, c.price, 0, 14, true, 'sourcing',
  c.region, c.country, c.city, true, c.attributes
from catalog c
join public.categories cat on cat.slug = c.category
on conflict (slug) do update set
  name = excluded.name,
  brand = excluded.brand,
  description = excluded.description,
  category_id = excluded.category_id,
  image_url = excluded.image_url,
  price_etb_cents = excluded.price_etb_cents,
  delivery_days = excluded.delivery_days,
  is_published = excluded.is_published,
  listing_type = excluded.listing_type,
  market_region = excluded.market_region,
  market_country = excluded.market_country,
  market_city = excluded.market_city,
  is_catalog_sample = excluded.is_catalog_sample,
  catalog_attributes = excluded.catalog_attributes;

insert into public.product_variants (product_id, label, price_delta_etb_cents, sort_order)
select p.id, 'Sample option', 0, 1
from public.products p
where p.is_catalog_sample
  and not exists (
    select 1 from public.product_variants pv
    where pv.product_id = p.id and pv.label = 'Sample option'
  );

-- New seller listings store the same category attributes that power shop facets.
-- Keep the older RPC overload available for already-deployed clients.
create function public.create_seller_listing_with_market(
  _name text,
  _slug text,
  _brand text,
  _description text,
  _image_url text,
  _price_etb_cents bigint,
  _deposit_percent integer,
  _delivery_days integer,
  _category_id uuid,
  _variant_labels text[],
  _market_region text,
  _market_country text,
  _market_city text,
  _catalog_attributes jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists (
    select 1 from public.seller_profiles
    where user_id = auth.uid() and status = 'verified'
  ) then raise exception 'A verified seller account is required'; end if;
  if length(trim(coalesce(_name, ''))) not between 2 and 160 then
    raise exception 'Product name must be between 2 and 160 characters';
  end if;
  if _slug is null or _slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Product URL slug is invalid';
  end if;
  if _price_etb_cents is null or _price_etb_cents <= 0 then
    raise exception 'Price must be greater than zero';
  end if;
  if _deposit_percent is null or _deposit_percent not between 1 and 100 then
    raise exception 'Deposit must be between 1 and 100 percent';
  end if;
  if _delivery_days is null or _delivery_days not between 1 and 365 then
    raise exception 'Delivery estimate must be between 1 and 365 days';
  end if;
  if coalesce(cardinality(_variant_labels), 0) not between 1 and 20 then
    raise exception 'Provide between 1 and 20 product options';
  end if;
  if exists (
    select 1 from unnest(_variant_labels) as labels(label)
    where length(trim(coalesce(label, ''))) not between 1 and 80
  ) then raise exception 'Each product option must be between 1 and 80 characters'; end if;
  if _market_region not in (
    'africa', 'asia', 'europe', 'middle_east', 'north_america',
    'central_america_caribbean', 'south_america', 'oceania'
  ) then raise exception 'Choose a valid market region'; end if;
  if _market_country is null or char_length(btrim(_market_country)) not between 2 and 80 then
    raise exception 'Enter a country between 2 and 80 characters';
  end if;
  if _market_city is not null and char_length(btrim(_market_city)) not between 2 and 80 then
    raise exception 'Enter a city between 2 and 80 characters';
  end if;
  if _category_id is null then raise exception 'Choose a category for this listing'; end if;
  if _catalog_attributes is null or jsonb_typeof(_catalog_attributes) <> 'object' then
    raise exception 'Product attributes must be an object';
  end if;
  if not exists (select 1 from public.categories where id = _category_id) then
    raise exception 'Choose a valid product category';
  end if;
  if exists (
    select 1
    from public.categories c
    cross join lateral jsonb_array_elements(c.filter_definitions) as definition(item)
    where c.id = _category_id
      and not (_catalog_attributes ? (definition.item->>'key'))
  ) then raise exception 'Complete every category detail'; end if;
  if exists (
    select 1
    from jsonb_each_text(_catalog_attributes) as selected(key, value)
    where not exists (
      select 1
      from public.categories c
      cross join lateral jsonb_array_elements(c.filter_definitions) as definition(item)
      cross join lateral jsonb_array_elements_text(definition.item->'options') as option(value)
      where c.id = _category_id
        and definition.item->>'key' = selected.key
        and option.value = selected.value
    )
  ) then raise exception 'Choose valid values for this category'; end if;

  insert into public.products (
    seller_user_id, listing_type, slug, name, brand, description, image_url,
    price_etb_cents, deposit_percent, delivery_days, category_id, is_published,
    market_region, market_country, market_city, catalog_attributes
  ) values (
    auth.uid(), 'seller', _slug, trim(_name), nullif(trim(_brand), ''),
    nullif(trim(_description), ''), nullif(trim(_image_url), ''),
    _price_etb_cents, _deposit_percent, _delivery_days, _category_id, false,
    _market_region, btrim(_market_country), nullif(btrim(_market_city), ''), _catalog_attributes
  ) returning id into listing_id;

  insert into public.product_variants (product_id, label, sort_order)
  select listing_id, trim(label), ordinal::integer
  from unnest(_variant_labels) with ordinality as labels(label, ordinal);
  return listing_id;
end;
$$;

revoke all on function public.create_seller_listing_with_market(
  text, text, text, text, text, bigint, integer, integer, uuid, text[], text, text, text, jsonb
) from public, anon;
grant execute on function public.create_seller_listing_with_market(
  text, text, text, text, text, bigint, integer, integer, uuid, text[], text, text, text, jsonb
) to authenticated;
