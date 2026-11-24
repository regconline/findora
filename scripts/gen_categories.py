# Generates supabase/migrations/..._seed_categories.sql from the taxonomy below.
import re
T = [
 ("Healthcare and Medical","stethoscope","Doctors, dentists, pharmacies, therapists and medical centres.",
  ["General Practitioners","Dentists","Optometrists","Pharmacies","Physiotherapists","Medical Centres","Psychologists","Specialist Doctors","Nursing Services","Dietitians"]),
 ("Beauty and Wellness","sparkles","Salons, spas, barbers, fitness and personal wellness services.",
  ["Hair Salons","Barbers","Nail Technicians","Spas and Massage","Skin Care","Makeup Artists","Gyms and Fitness","Personal Trainers"]),
 ("Automotive","car","Mechanics, panel beaters, tyres, car washes and vehicle services.",
  ["Mechanics","Panel Beaters","Tyre Services","Car Wash","Auto Electrical","Towing","Car Dealers","Auto Parts"]),
 ("Construction and Contractors","hard-hat","Builders, plumbers, electricians, roofers and renovators.",
  ["Plumbers","Electricians","Builders","Roofing","Painting","Renovations","Tiling","Paving","Welding and Steelwork"]),
 ("Home Services","house","Repairs, gardening, pest control and services for the home.",
  ["Handymen","Gardening and Landscaping","Pest Control","Pool Services","Appliance Repairs","Locksmiths","Interior Design","Solar Installation"]),
 ("Professional Services","briefcase","Consultants, marketing, design and business support.",
  ["Business Consultants","Marketing and Advertising","Graphic Design","Photography","Printing","Translation","Recruitment","Architects"]),
 ("Legal Services","scale","Attorneys, conveyancers and legal advisors.",
  ["Attorneys","Conveyancers","Family Law","Labour Law","Notaries","Debt Review"]),
 ("Financial Services","landmark","Accountants, tax practitioners, insurance and financial advice.",
  ["Accountants","Tax Practitioners","Bookkeepers","Insurance Brokers","Financial Advisors","Payroll Services"]),
 ("Restaurants and Food","utensils","Restaurants, takeaways, caterers, bakeries and food producers.",
  ["Restaurants","Takeaways","Caterers","Bakeries","Coffee Shops","Butcheries","Food Trucks"]),
 ("Accommodation and Tourism","bed","Guesthouses, lodges, tour operators and travel services.",
  ["Guesthouses","Bed and Breakfasts","Lodges","Self-Catering","Tour Operators","Travel Agents","Venues"]),
 ("Education and Training","graduation-cap","Schools, tutors, colleges, skills and driving schools.",
  ["Tutors","Early Childhood Development","Private Schools","Colleges","Skills Training","Driving Schools","Music Lessons"]),
 ("Technology and IT","laptop","IT support, web development, software and device repairs.",
  ["IT Support","Web Development","Software Development","Computer Repairs","Phone Repairs","Networking and CCTV","Internet Providers"]),
 ("Retail and Shopping","shopping-bag","Shops, boutiques, hardware stores and online retailers.",
  ["Clothing and Fashion","Hardware Stores","Furniture","Electronics","Spaza and Convenience","Online Stores","Florists"]),
 ("Events and Entertainment","party-popper","Event planners, DJs, décor, hire and entertainment.",
  ["Event Planners","DJs and Musicians","Décor and Hire","Wedding Services","Photographers and Videographers","Kids Parties"]),
 ("Agriculture and Farming","tractor","Farms, agricultural suppliers, vets and farm services.",
  ["Crop Farming","Livestock","Agricultural Supplies","Veterinarians","Nurseries","Farm Equipment"]),
 ("Cleaning Services","spray-can","Domestic, office, carpet and specialised cleaning.",
  ["Domestic Cleaning","Office Cleaning","Carpet and Upholstery","Window Cleaning","Laundry and Dry Cleaning","Waste Removal"]),
 ("Security Services","shield-check","Guarding, armed response, alarms and access control.",
  ["Armed Response","Guarding","Alarm Systems","Access Control","Electric Fencing"]),
 ("Transport and Logistics","truck","Couriers, movers, freight, shuttles and transport.",
  ["Couriers","Removals","Freight and Trucking","Shuttle Services","Car Hire","Storage"]),
 ("Real Estate","building","Estate agents, property management and rentals.",
  ["Estate Agents","Property Management","Rentals","Property Valuers","Student Accommodation"]),
 ("Other Services","layers","Businesses and services not listed elsewhere.",
  ["Funeral Services","Religious Organisations","NGOs and Community","Pet Services","Tailoring and Alterations","General Services"]),
]
import unicodedata
def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower().replace('&', ' and ')
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s)).strip('-')
def q(s): return "'"+s.replace("'","''")+"'"
out=["-- Seed: initial business categories and subcategories (editable in the admin dashboard)"]
for i,(n,icon,d,subs) in enumerate(T):
    out.append(f"insert into public.categories (slug,name,description,icon,sort_order,seo_title,seo_description) values ({q(slug(n))},{q(n)},{q(d)},{q(icon)},{(i+1)*10},{q(n+' in South Africa')},{q('Find '+n.lower()+' businesses across South Africa on Findora. '+d)}) on conflict (slug) do nothing;")
    for j,s in enumerate(subs):
        out.append(f"insert into public.subcategories (category_id,slug,name,sort_order) select id,{q(slug(s))},{q(s)},{(j+1)*10} from public.categories where slug={q(slug(n))} on conflict (category_id,slug) do nothing;")
open('supabase/migrations/20261124000005_seed_categories.sql','w').write("\n".join(out)+"\n")
print(len(out))
