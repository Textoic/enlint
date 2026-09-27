import queriesToErrors from "../queries-to-errors.js";
import { ErrorId, type ParsedToken } from "../types/index.js";

const selectors = [
  {
    selector: "[form=canceled i]",
    suggestions: ["cancelled"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[form=cancelled i]",
    suggestions: ["canceled"],
    "en-US": true,
  },
  {
    selector: "[form=traveled i]",
    suggestions: ["travelled"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[form=travelled i]",
    suggestions: ["traveled"],
    "en-US": true,
  },
  {
    selector: "[form=channeled i]",
    suggestions: ["channelled"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[form=channelled i]",
    suggestions: ["channeled"],
    "en-US": true,
  },
  {
    selector: "[form=marvelous i]",
    suggestions: ["marvellous"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[form=marvellous i]",
    suggestions: ["marvelous"],
    "en-US": true,
  },
  {
    selector: "[form=counselor i]",
    suggestions: ["counsellor"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[form=counsellor i]",
    suggestions: ["counselor"],
    "en-US": true,
  },

  {
    selector: "[lemma=license][xpos=NOUN]",
    suggestions: [":inflect(licence)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=licence]",
    suggestions: [":inflect(license)"],
    "en-US": true,
  },
  {
    selector: "[lemma=defense][xpos=NOUN]",
    suggestions: [":inflect(defence)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=defence]",
    suggestions: [":inflect(defense)"],
    "en-US": true,
  },

  {
    selector: "[lemma=organize]",
    suggestions: [":inflect(organise)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=organise]",
    suggestions: [":inflect(organize)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=authorize]",
    suggestions: [":inflect(authorise)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=authorise]",
    suggestions: [":inflect(authorize)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=prioritize]",
    suggestions: [":inflect(prioritise)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=prioritise]",
    suggestions: [":inflect(prioritize)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=realize]",
    suggestions: [":inflect(realise)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=realise]",
    suggestions: [":inflect(realize)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=recognize]",
    suggestions: [":inflect(recognise)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=recognise]",
    suggestions: [":inflect(recognize)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=apologize]",
    suggestions: [":inflect(apologise)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=apologise]",
    suggestions: [":inflect(apologize)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=memorize]",
    suggestions: [":inflect(memorise)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=memorise]",
    suggestions: [":inflect(memorize)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=appetizer]",
    suggestions: [":inflect(appetiser)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=appetiser]",
    suggestions: [":inflect(appetizer)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=familiarize]",
    suggestions: [":inflect(familiarise)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=familiarise]",
    suggestions: [":inflect(familiarize)"],
    "en-US": true,
    "en-CA": true,
  },

  { selector: "[lemma=cozy]", suggestions: [":inflect(cosy)"], "en-GB": true },
  { selector: "[lemma=cosy]", suggestions: [":inflect(cozy)"], "en-US": true },

  {
    selector: "[lemma=enroll]",
    suggestions: [":inflect(enrol)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=enrol]",
    suggestions: [":inflect(enroll)"],
    "en-US": true,
  },
  {
    selector: "[lemma=fulfill]",
    suggestions: [":inflect(fulfil)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=fulfil]",
    suggestions: [":inflect(fulfill)"],
    "en-US": true,
  },
  {
    selector: "[lemma=skilfull]",
    suggestions: [":inflect(skilful)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=skilful]",
    suggestions: [":inflect(skilfull)"],
    "en-US": true,
  },

  {
    selector: "[lemma=program]",
    suggestions: [":inflect(programme)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=programme]",
    suggestions: [":inflect(program)"],
    "en-US": true,
  },

  {
    selector: "[lemma=behavior]",
    suggestions: [":inflect(behaviour)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=behaviour]",
    suggestions: [":inflect(behavior)"],
    "en-US": true,
  },
  {
    selector: "[lemma=color]",
    suggestions: [":inflect(colour)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=colour]",
    suggestions: [":inflect(color)"],
    "en-US": true,
  },
  {
    selector: "[lemma=honor]",
    suggestions: [":inflect(honour)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=honour]",
    suggestions: [":inflect(honor)"],
    "en-US": true,
  },
  {
    selector: "[lemma=favorite]",
    suggestions: [":inflect(favourite)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=favourite]",
    suggestions: [":inflect(favorite)"],
    "en-US": true,
  },
  {
    selector: "[lemma=humor]",
    suggestions: [":inflect(humour)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=humour]",
    suggestions: [":inflect(humor)"],
    "en-US": true,
  },
  {
    selector: "[lemma=flavor]",
    suggestions: [":inflect(flavour)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=flavour]",
    suggestions: [":inflect(flavor)"],
    "en-US": true,
  },
  {
    selector: "[lemma=harbor]",
    suggestions: [":inflect(harbour)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=harbour]",
    suggestions: [":inflect(harbor)"],
    "en-US": true,
  },
  {
    selector: "[lemma=labor]",
    suggestions: [":inflect(labour)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=labour]",
    suggestions: [":inflect(labor)"],
    "en-US": true,
  },
  {
    selector: "[lemma=mold]",
    suggestions: [":inflect(mould)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=mould]",
    suggestions: [":inflect(mold)"],
    "en-US": true,
  },
  {
    selector: "[lemma=neighbor]",
    suggestions: [":inflect(neighbour)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=neighbour]",
    suggestions: [":inflect(neighbor)"],
    "en-US": true,
  },

  {
    selector: "[lemma=diarrea]",
    suggestions: [":inflect(diarrhoea)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=diarrhoea]",
    suggestions: [":inflect(diarrea)"],
    "en-US": true,
  },

  {
    selector: "[lemma=catalog]",
    suggestions: [":inflect(catalogue)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=catalogue]",
    suggestions: [":inflect(catalog)"],
    "en-US": true,
  },
  {
    selector: "[lemma=dialog]",
    suggestions: [":inflect(dialogue)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=dialogue]",
    suggestions: [":inflect(dialog)"],
    "en-US": true,
  },
  {
    selector: "[lemma=analog]",
    suggestions: [":inflect(analogue)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=analogue]",
    suggestions: [":inflect(analog)"],
    "en-US": true,
  },
  {
    selector: "[lemma=monolog]",
    suggestions: [":inflect(monologue)"],
    "en-GB": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=monologue]",
    suggestions: [":inflect(monolog)"],
    "en-US": true,
  },

  {
    selector: "[lemma=center]",
    suggestions: [":inflect(centre)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=centre]",
    suggestions: [":inflect(center)"],
    "en-US": true,
  },
  {
    selector: "[lemma=kilometer]",
    suggestions: [":inflect(kilometre)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=kilometre]",
    suggestions: [":inflect(kilometer)"],
    "en-US": true,
  },
  {
    selector: "[lemma=liter]",
    suggestions: [":inflect(litre)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=litre]",
    suggestions: [":inflect(liter)"],
    "en-US": true,
  },
  {
    selector: "[lemma=theater]",
    suggestions: [":inflect(theatre)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=theatre]",
    suggestions: [":inflect(theater)"],
    "en-US": true,
  },
  {
    selector: "[lemma=fiber]",
    suggestions: [":inflect(fibre)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=fibre]",
    suggestions: [":inflect(fiber)"],
    "en-US": true,
  },

  {
    selector: "[form=learnt i][xpos=VERB]",
    suggestions: ["learned"],
    "en-US": true,
  },
  {
    selector: "[form=dreamt i][xpos=VERB]",
    suggestions: ["dreamed"],
    "en-US": true,
  },
  {
    selector: "[form=burnt i][xpos=VERB]",
    suggestions: ["burned"],
    "en-US": true,
  },
  {
    selector: "[form=leapt i][xpos=VERB]",
    suggestions: ["leaped"],
    "en-US": true,
  },

  { selector: "[lemma=tyre]", suggestions: [":inflect(tire)"], "en-US": true },
  { selector: "[lemma=tire]", suggestions: [":inflect(tyre)"], "en-GB": true },

  {
    selector: "[lemma=eggplant]",
    suggestions: [":inflect(aubergine)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=aubergine]",
    suggestions: [":inflect(eggplant)"],
    "en-US": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: ":matches([lemma=barrister], [lemma=solicitor])",
    suggestions: [":inflect(lawyer)", ":inflect(attorney)"],
    "en-US": true,
  },
  {
    selector: "[lemma=bathe][xpos=VERB]",
    suggestions: [":inflect(bath)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=bath][xpos=VERB]",
    suggestions: [":inflect(bathe)"],
    "en-US": true,
    "en-AU": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=beet]",
    suggestions: [":inflect(beetroot)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=beetroot]",
    suggestions: [":inflect(beet)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=can] > :matches([form=garbage i], [form=trash i])",
    suggestions: [":inflect(bin)", ":inflect(dustbin)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: ":matches([lemma=bin], [lemma=dustbin])",
    suggestions: ["garbage :inflect(can)", "trash :inflect(can)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=pen] > [form=ball-point i]",
    suggestions: ["biro"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=biro]",
    suggestions: ["ball-point :inflect(pen)"],
    "en-US": true,
  },
  {
    selector: "[lemma=floss] > [form=fairy i]",
    suggestions: ["candy :inflect(floss)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=floss] > [form=fairy i]",
    suggestions: ["cotton :inflect(candy)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=candy] > [form=cotton i]",
    suggestions: ["candy :inflect(floss)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=candy] > [form=cotton i]",
    suggestions: ["fairy :inflect(floss)"],
    "en-AU": true,
  },
  {
    selector: "[lemma=floss] > [form=candy i]",
    suggestions: ["cotton :inflect(candy)"],
    "en-US": true,
  },
  {
    selector: "[lemma=floss] > [form=candy i]",
    suggestions: ["fairy :inflect(floss)"],
    "en-AU": true,
  },
  {
    selector: "[lemma=lot] > [form=parking i]",
    suggestions: ["car :inflect(park)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=park] > [form=car i]",
    suggestions: ["parking :inflect(lot)"],
    "en-US": true,
  },
  {
    selector: "[lemma=drugstore]",
    suggestions: ["chemist's :inflect(shop)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=shop] > [AdpType=Post][lemma=be] > [form=chemist i]",
    suggestions: [":inflect(drugstore)", ":inflect(pharmacy)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=clothespin]",
    suggestions: ["clothes :inflect(peg)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=peg] > [form=clothes i]",
    suggestions: [":inflect(clothespin)"],
    "en-US": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=stove][xpos=NOUN]",
    suggestions: [":inflect(cooker)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=cooker][xpos=NOUN]",
    suggestions: [":inflect(stove)"],
    "en-US": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=zucchini]",
    suggestions: [":inflect(courgette)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=courgette]",
    suggestions: [":inflect(zucchini)"],
    "en-US": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[form=résumé i]",
    suggestions: ["curriculum :inflect(vitae)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=vitae] > [form=curriculum i]",
    suggestions: [":inflect(résumé)"],
    "en-US": true,
  },
  {
    selector: "[lemma=cream] > [form=heavy i]",
    suggestions: ["double :inflect(cream)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=cream] > [form=double i]",
    suggestions: ["heavy :inflect(cream)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[form=draft i]",
    suggestions: ["draught"],
    "en-GB": true,
  },
  {
    selector: "[form=draught i]",
    suggestions: ["draft"],
    "en-US": true,
  },
  {
    selector: "[lemma=thumbtack]",
    suggestions: ["drawing :inflect(pin)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=pin] > [form=drawing i]",
    suggestions: [":inflect(thumbtack)"],
    "en-US": true,
  },
  {
    selector: "[lemma=gown] > [form=dressing i]",
    suggestions: [":inflect(bathrobe)"],
    "en-US": true,
  },
  {
    selector: "[lemma=driving] > [form=drunk i]",
    suggestions: ["drink :inflect(driving)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=driving] > [form=drink i]",
    suggestions: ["drunk :inflect(driving)"],
    "en-US": true,
  },
  {
    selector: "[lemma=license] > [AdpType=Post][lemma=be] > [form=driver i]",
    suggestions: ["driving :inflect(licence)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=licence] > [form=driving i]",
    suggestions: ["driver's :inflect(license)"],
    "en-US": true,
  },
  {
    selector: "[lemma=inquiry]",
    suggestions: [":inflect(enquiry)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=enquiry]",
    suggestions: [":inflect(inquiry)"],
    "en-US": true,
  },
  {
    selector: "[lemma=date] > [form=expiration i]",
    suggestions: ["expiry :inflect(date)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=date] > [form=expiry i]",
    suggestions: ["expiration :inflect(date)"],
    "en-US": true,
  },
  {
    selector: "[lemma=dress] > [form=fancy i]",
    suggestions: [":inflect(costume)"],
    "en-US": true,
  },
  {
    selector: "[lemma=stick] > [form=fish i]",
    suggestions: ["fish :inflect(finger)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=finger] > [form=fish i]",
    suggestions: ["fish :inflect(stick)"],
    "en-US": true,
  },
  {
    selector: "[lemma=apartment][xpos=NOUN]",
    suggestions: [":inflect(flat)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=shift] > [form=gear i]",
    suggestions: ["gear :inflect(lever)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=lever] > [form=gear i]",
    suggestions: ["gear :inflect(shift)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=train][xpos=NOUN] > [form=freight i]",
    suggestions: ["goods :inflect(train)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=train][xpos=NOUN] > [form=goods i]",
    suggestions: ["freight :inflect(train)"],
    "en-US": true,
  },
  {
    selector: "[lemma=principal][xpos=NOUN]",
    suggestions: [":inflect(headmaster)", ":inflect(headteacher)"],
    "en-GB": true,
  },
  {
    selector: ":matches([lemma=headmaster], [lemma=headteacher])",
    suggestions: [":inflect(principal)"],
    "en-US": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=cleaner] > [form=vacuum i]",
    suggestions: [":inflect(hoover)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=sugar] > [form=powdered i]",
    suggestions: ["icing :inflect(sugar)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=sugar] > [form=icing i]",
    suggestions: ["powdered :inflect(sugar)"],
    "en-US": true,
  },
  {
    selector: "[lemma=potato] > [form=baked i]",
    suggestions: ["jacket :inflect(potato)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=potato] > [form=jacket i]",
    suggestions: ["baked :inflect(potato)"],
    "en-US": true,
  },
  {
    selector: "[lemma=comma] > [form=inverted i]",
    suggestions: ["quotation :inflect(mark)"],
    "en-US": true,
  },
  {
    selector: "[lemma=jewelry]",
    suggestions: [":inflect(jewellery)"],
    "en-GB": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=jewellery]",
    suggestions: [":inflect(jewelry)"],
    "en-US": true,
  },
  {
    selector: "[lemma=sale] > [form=yard i]",
    suggestions: ["jumble :inflect(sale)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=sale] > [form=jumble i]",
    suggestions: ["yard :inflect(sale)"],
    "en-US": true,
  },
  {
    selector: "[lemma=ladybug]",
    suggestions: [":inflect(ladybird)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=ladybird]",
    suggestions: [":inflect(ladybug)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=lay] > [form=table i]",
    suggestions: [":inflect(set) the table"],
    "en-US": true,
  },
  {
    selector: "[lemma=elevator][xpos=NOUN]",
    suggestions: [":inflect(lift)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=lift][xpos=NOUN]",
    suggestions: [":inflect(elevator)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=mailbox]",
    suggestions: [":inflect(letterbox)", ":inflect(postbox)"],
    "en-GB": true,
  },
  {
    selector: ":matches([lemma=letterbox], [lemma=postbox])",
    suggestions: [":inflect(mailbox)"],
    "en-US": true,
  },
  {
    selector: "[lemma=truck]",
    suggestions: [":inflect(lorry)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=lorry]",
    suggestions: [":inflect(truck)"],
    "en-US": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector:
      "[form=lost i][xpos=NOUN] > [form=and] > [form=found i][xpos=NOUN]",
    suggestions: ["lost property"],
    "en-GB": true,
  },
  {
    selector: "[lemma=property] > [form=lost i][xpos=ADJ]",
    suggestions: ["lost and found"],
    "en-US": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[form=ceo i]",
    suggestions: ["managing :inflect(director)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=director] > [form=managing i]",
    suggestions: [":inflect(CEO)"],
    "en-US": true,
  },
  {
    selector: "[form=maths i]",
    suggestions: ["math"],
    "en-US": true,
  },
  {
    selector: "[lemma=cellphone]",
    suggestions: ["mobile :inflect(phone)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=phone] > [form=mobile i]",
    suggestions: [":inflect(cellphone)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=motorcycle]",
    suggestions: [":inflect(motorbike)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=motorbike]",
    suggestions: [":inflect(motorcycle)"],
    "en-US": true,
  },
  {
    selector: ":matches([lemma=freeway], [lemma=highway])",
    suggestions: [":inflect(motorway)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=motorway]",
    suggestions: [":inflect(freeway)", ":inflect(highway)"],
    "en-US": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=mom]",
    suggestions: [":inflect(mum)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  { selector: "[lemma=mum]", suggestions: [":inflect(mom)"], "en-US": true },
  {
    selector: "[lemma=diaper]",
    suggestions: [":inflect(nappy)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=nappy]",
    suggestions: [":inflect(diaper)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=plate] > [form=license i]",
    suggestions: ["number :inflect(plate)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=plate] > [form=number i]",
    suggestions: ["license :inflect(plate)"],
    "en-US": true,
  },
  {
    selector: "[lemma=deck] > [form=of i] > [form=cards i]",
    suggestions: [":inflect(pack) of cards"],
    "en-GB": true,
  },
  {
    selector: "[lemma=pack] > [form=of i] > [form=cards i]",
    suggestions: [":inflect(deck) of cards"],
    "en-US": true,
  },
  {
    selector: ":matches([lemma=kerosene], [lemma=kerosine])",
    suggestions: [":inflect(paraffin)", ":inflect(paraffine)"],
    "en-GB": true,
  },
  {
    selector: ":matches([lemma=paraffin], [lemma=paraffine])",
    suggestions: [":inflect(kerosene)", ":inflect(kerosine)"],
    "en-US": true,
  },
  {
    selector: "[lemma=crosswalk]",
    suggestions: ["pedestrian :inflect(crossing)", "zebra :inflect(crossing)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector:
      "[lemma=crossing] > :matches([form=pedestrian i], [form=zebra i])",
    suggestions: [":inflect(crosswalk)"],
    "en-US": true,
  },
  {
    selector: "[lemma=gasoline][xpos=NOUN]",
    suggestions: [":inflect(petrol)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=petrol]",
    suggestions: [":inflect(gasoline)", ":inflect(gas)"],
    "en-US": true,
  },
  {
    selector: "[lemma=booth] > [form=phone i]",
    suggestions: ["phone :inflect(box)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=box] > [form=phone i]",
    suggestions: ["phone :inflect(booth)"],
    "en-US": true,
  },
  {
    selector: "[lemma=turtleneck]",
    suggestions: ["polo :inflect(neck)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=neck] > [form=polo i]",
    suggestions: [":inflect(turtleneck)"],
    "en-US": true,
  },
  {
    selector: "[lemma=mailman]",
    suggestions: [":inflect(postman)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=postman]",
    suggestions: [":inflect(mailman)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: ":matches([lemma=carriage], [lemma=buggy]) > [form=baby i]",
    suggestions: [
      ":inflect(pram)",
      ":inflect(perambulator)",
      ":inflect(pushchair)",
    ],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: ":matches([lemma=pram], [lemma=perambulator], [lemma=pushchair])",
    suggestions: [
      "baby :inflect(carriage)",
      "baby :inflect(buggy)",
      ":inflect(stroller)",
    ],
    "en-US": true,
  },
  {
    selector: "[lemma=school] > :matches([form=elementary i], [form=grade i])",
    suggestions: ["primary :inflect(school)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=school] > [form=primary i]",
    suggestions: ["elementary :inflect(school)", "grade :inflect(school)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=railroad]",
    suggestions: [":inflect(railway)"],
    "en-GB": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=railway]",
    suggestions: [":inflect(railroad)"],
    "en-US": true,
  },
  {
    selector: "[lemma=quid]",
    suggestions: ["sterling :inflect(pound)"],
    "en-US": true,
  },
  {
    selector: "[lemma=garbage]",
    suggestions: [":inflect(rubbish)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=rubbish]",
    suggestions: [":inflect(garbage)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=wrench]",
    suggestions: [":inflect(spanner)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=spanner]",
    suggestions: [":inflect(wrench)"],
    "en-US": true,
  },
  {
    selector: "[lemma=store] > [form=candy i]",
    suggestions: ["sweet :inflect(shop)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=shop] > [form=sweet i]",
    suggestions: ["candy :inflect(store)"],
    "en-US": true,
  },
  {
    selector: "[lemma=faucet]",
    suggestions: [":inflect(tap)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=sultana]",
    suggestions: ["golden :inflect(raisin)"],
    "en-US": true,
  },
  {
    selector: ":matches([lemma=bathroom], [lemma=restroom])",
    suggestions: [":inflect(toilet)", ":inflect(loo)", ":inflect(WC)"],
    "en-GB": true,
  },
  {
    selector: ":matches([lemma=toilet], [lemma=loo], [form=WC])",
    suggestions: [":inflect(bathroom)", ":inflect(restroom)"],
    "en-US": true,
  },
  {
    selector: "[lemma=streetcar]",
    suggestions: [":inflect(tram)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=tram]",
    suggestions: [":inflect(streetcar)"],
    "en-US": true,
    "en-CA": true,
  },
  {
    selector: "[lemma=cart]",
    suggestions: [":inflect(trolley)"],
    "en-GB": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=trolley]",
    suggestions: [":inflect(cart)"],
    "en-US": true,
  },
  {
    selector: "[lemma=pants]",
    suggestions: [":inflect(trousers)"],
    "en-GB": true,
  },
  {
    selector: "[lemma=trousers]",
    suggestions: [":inflect(pants)"],
    "en-US": true,
    "en-CA": true,
    "en-AU": true,
  },
  {
    selector: "[lemma=mortician]",
    suggestions: [":inflect(undertaker)"],
    "en-GB": true,
  },
];

const enUS = selectors
  .filter(({ "en-US": isAmerican = false }) => isAmerican)
  .map(({ ...query }) => ({
    ...query,
    message: "Use the American English spelling whenever possible",
    id: ErrorId.NO_MIXED_DIALECTS,
  }));

const enGB = selectors
  .filter(({ "en-GB": isBritish = false }) => isBritish)
  .map(({ ...query }) => ({
    ...query,
    message: "Use the British English spelling whenever possible",
    id: ErrorId.NO_MIXED_DIALECTS,
  }));

const enAU = selectors
  .filter(({ "en-AU": isAustralian = false }) => isAustralian)
  .map(({ ...query }) => ({
    ...query,
    message: "Use the Australian English spelling whenever possible",
    id: ErrorId.NO_MIXED_DIALECTS,
  }));

const enCA = selectors
  .filter(({ "en-CA": isCanadian = false }) => isCanadian)
  .map(({ ...query }) => ({
    ...query,
    message: "Use the Canadian English spelling whenever possible",
    id: ErrorId.NO_MIXED_DIALECTS,
  }));

const getQueries = (locale: string) => {
  switch (locale) {
    case "en-AU":
      return enAU;
    case "en-CA":
      return enCA;
    case "en-GB":
      return enGB;
    case "en-US":
    default:
      return enUS;
  }
};

export default (sentences: ParsedToken[][], { locale = "en-US" }) =>
  queriesToErrors(getQueries(locale), sentences);
