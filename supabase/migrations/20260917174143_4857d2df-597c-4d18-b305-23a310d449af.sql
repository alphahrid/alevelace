insert into public.subjects (slug, name, color, board, description) values
('economics','Economics','#f59e0b','both','Micro and macroeconomics with diagram and evaluation training for Papers 1-4 / Units 1-4.'),
('law','Law','#a855f7','both','Criminal, contract and tort law plus the legal system, justice and morality essays.'),
('psychology','Psychology','#ec4899','both','Core studies, the four approaches and research methods with GRAVE evaluation.')
on conflict (slug) do nothing;

with s as (select id, slug from public.subjects where slug in ('economics','law','psychology'))
insert into public.topics (subject_id, name, slug, syllabus_ref, position, level)
select s.id, v.name, v.slug, v.ref, v.pos, v.lvl::syllabus_level
from s join (values
 -- ECONOMICS AS
 ('economics','Basic economic ideas and resource allocation','econ-basic-ideas','CIE 1 / Edexcel Theme 1',1,'as'),
 ('economics','Demand, supply and market equilibrium','econ-demand-supply','CIE 2.1 / Theme 1.2',2,'as'),
 ('economics','Elasticities (PED, YED, XED, PES)','econ-elasticities','CIE 2.2 / Theme 1.2',3,'as'),
 ('economics','Consumer and producer surplus','econ-surplus','CIE 2.3',4,'as'),
 ('economics','Market failure and externalities','econ-market-failure','CIE 3 / Theme 1.3',5,'as'),
 ('economics','Government intervention in microeconomics','econ-micro-intervention','CIE 3.2 / Theme 1.4',6,'as'),
 ('economics','Measurement of macroeconomic performance','econ-macro-measures','CIE 4 / Theme 2.1',7,'as'),
 ('economics','Aggregate demand and aggregate supply','econ-ad-as','CIE 4.2 / Theme 2.3',8,'as'),
 ('economics','Inflation, unemployment and growth','econ-inflation-unemployment','CIE 4.3 / Theme 2.2',9,'as'),
 ('economics','Macroeconomic policy: fiscal, monetary, supply-side','econ-macro-policy','CIE 5 / Theme 2.6',10,'as'),
 ('economics','International trade and the balance of payments','econ-trade-bop','CIE 6 / Theme 4.1',11,'as'),
 -- ECONOMICS A2
 ('economics','Utility, indifference curves and budget lines','econ-utility','CIE 7.1',12,'a2'),
 ('economics','Costs, revenues and profit maximisation','econ-costs-revenue','CIE 7.2 / Theme 3.3',13,'a2'),
 ('economics','Market structures: perfect competition to monopoly','econ-market-structures','CIE 7.3 / Theme 3.4',14,'a2'),
 ('economics','Oligopoly and game theory','econ-oligopoly','CIE 7.3 / Theme 3.4',15,'a2'),
 ('economics','Labour markets and wage determination','econ-labour','CIE 8 / Theme 3.5',16,'a2'),
 ('economics','Income distribution, poverty and inequality','econ-inequality','CIE 8.2 / Theme 4.2',17,'a2'),
 ('economics','Economic growth and development indicators','econ-development','CIE 9 / Theme 4.3',18,'a2'),
 ('economics','Money, banking and monetary policy transmission','econ-money-banking','CIE 10 / Theme 4.4',19,'a2'),
 ('economics','Exchange rates and international competitiveness','econ-exchange-rates','CIE 11 / Theme 4.1',20,'a2'),
 ('economics','Policy conflicts and trade-offs','econ-policy-conflicts','CIE 12 / Theme 4.5',21,'a2'),
 -- LAW AS
 ('law','Sources of law: legislation and statutory interpretation','law-sources-legislation','CIE 1.1',1,'as'),
 ('law','Judicial precedent and case law','law-precedent','CIE 1.2',2,'as'),
 ('law','The court structure and civil procedure','law-courts-civil','CIE 2.1',3,'as'),
 ('law','Criminal procedure, sentencing and appeals','law-criminal-procedure','CIE 2.2',4,'as'),
 ('law','Legal personnel and access to justice','law-personnel-access','CIE 2.3',5,'as'),
 ('law','Law and morality, justice and society','law-morality-justice','CIE 3.1',6,'as'),
 ('law','Contract: offer, acceptance and consideration','law-contract-formation','CIE 4.1',7,'as'),
 ('law','Contract: intention, terms and vitiating factors','law-contract-terms','CIE 4.2',8,'as'),
 ('law','Tort: negligence duty, breach and causation','law-negligence','CIE 5.1',9,'as'),
 -- LAW A2
 ('law','Remedies and damages in contract and tort','law-remedies','CIE 5.2',10,'a2'),
 ('law','Occupiers liability, nuisance and vicarious liability','law-other-torts','CIE 5.3',11,'a2'),
 ('law','Criminal law: actus reus, mens rea and strict liability','law-criminal-elements','CIE 6.1',12,'a2'),
 ('law','Fatal offences: murder and manslaughter','law-fatal-offences','CIE 6.2',13,'a2'),
 ('law','Non-fatal offences against the person','law-non-fatal','CIE 6.3',14,'a2'),
 ('law','Property offences: theft, robbery and burglary','law-property-offences','CIE 6.4',15,'a2'),
 ('law','General defences and capacity','law-defences','CIE 6.5',16,'a2'),
 ('law','Law reform, human rights and evaluation essays','law-reform-rights','CIE 7.1',17,'a2'),
 -- PSYCHOLOGY AS
 ('psychology','The biological approach and its core studies','psy-biological','CIE 1.1 / Edexcel Topic 2',1,'as'),
 ('psychology','The cognitive approach and its core studies','psy-cognitive','CIE 1.2 / Topic 1',2,'as'),
 ('psychology','The learning approach: classical and operant conditioning','psy-learning','CIE 1.3 / Topic 3',3,'as'),
 ('psychology','The social approach: obedience and conformity','psy-social','CIE 1.4 / Topic 4',4,'as'),
 ('psychology','Research methods: experiments and variables','psy-methods-experiments','CIE 2.1',5,'as'),
 ('psychology','Research methods: self-reports, observations, case studies','psy-methods-nonexp','CIE 2.2',6,'as'),
 ('psychology','Sampling, reliability, validity and ethics','psy-methods-ethics','CIE 2.3',7,'as'),
 ('psychology','Data handling, descriptive statistics and graphs','psy-data','CIE 2.4',8,'as'),
 -- PSYCHOLOGY A2
 ('psychology','Psychopathology: schizophrenia and mood disorders','psy-psychopathology','CIE 3.1 / Topic 6',9,'a2'),
 ('psychology','Anxiety, impulse control and obsessive disorders','psy-anxiety','CIE 3.2',10,'a2'),
 ('psychology','Health psychology: adherence, pain and stress','psy-health','CIE 4.1',11,'a2'),
 ('psychology','Organisational psychology: motivation and leadership','psy-organisational','CIE 5.1',12,'a2'),
 ('psychology','Consumer and criminal psychology applications','psy-applications','CIE 6.1 / Topic 7',13,'a2'),
 ('psychology','Developmental psychology: attachment and cognition','psy-developmental','CIE 7.1 / Topic 5',14,'a2'),
 ('psychology','Inferential statistics and choosing a test','psy-inferential','CIE 8.1',15,'a2'),
 ('psychology','Issues and debates plus GRAVE evaluation practice','psy-issues-debates','CIE 8.2',16,'a2')
) as v(subj, name, slug, ref, pos, lvl) on v.subj = s.slug
on conflict do nothing;