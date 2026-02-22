from urllib.parse import urlparse
import ipaddress
import re
import urllib
import urllib.request
import requests
from bs4 import BeautifulSoup
from datetime import datetime
try:
    import whois
except ImportError:
    class MockWhois:
        def whois(self, url):
            return None
    whois = MockWhois()


# 1. Checks for IP address in URL
def havingIP(url):
    try:
        ipaddress.ip_address(url)
        return 1
    except:
        return 0


# 2. Checks for @ symbol in URL
def haveAtSign(url):
    return 1 if "@" in url else 0


# 3. Length of URL
def getLength(url):
    return 1 if len(url) >= 75 else 0


# 4. Depth of URL
def getDepth(url):
    s = urlparse(url).path.split('/')
    depth = 0
    for j in range(len(s)):
        if len(s[j]) != 0:
            depth += 1
    return depth


# 5. Redirection "//" in URL
def redirection(url):
    pos = url.rfind('//')
    if pos > 6:
        if pos > 7:
            return 1
        else:
            return 0
    else:
        return 0


# 6. HTTPS token in domain
def httpDomain(url):
    domain = urlparse(url).netloc
    return 1 if 'https' in domain else 0


# 7. URL Shortening Services
shortening_services = r"bit\.ly|goo\.gl|shorte\.st|go2l\.ink|x\.co|ow\.ly|t\.co|tinyurl|tr\.im|is\.gd|cli\.gs|" \
                      r"yfrog\.com|migre\.me|ff\.im|tiny\.cc|url4\.eu|twit\.ac|su\.pr|twurl\.nl|snipurl\.com|" \
                      r"short\.to|BudURL\.com|ping\.fm|post\.ly|Just\.as|bkite\.com|snipr\.com|fic\.kr|loopt\.us|" \
                      r"doiop\.com|short\.ie|kl\.am|wp\.me|rubyurl\.com|om\.ly|to\.ly|bit\.do|lnkd\.in|db\.tt|" \
                      r"qr\.ae|adf\.ly|bitly\.com|cur\.lv|tinyurl\.com|ity\.im|q\.gs|po\.st|bc\.vc|u\.to|" \
                      r"j\.mp|buzurl\.com|cutt\.us|yourls\.org|prettylinkpro\.com|scrnch\.me|v\.gd"

def tinyURL(url):
    return 1 if re.search(shortening_services, url) else 0


# 8. Prefix or Suffix "-" in Domain
def prefixSuffix(url):
    return 1 if '-' in urlparse(url).netloc else 0


# 9. Web Traffic (Alexa)
def web_traffic(url):
    try:
        url = urllib.parse.quote(url)
        rank = BeautifulSoup(
            urllib.request.urlopen(
                "http://data.alexa.com/data?cli=10&dat=s&url=" + url
            ).read(),
            "xml"
        ).find("REACH")['RANK']
        rank = int(rank)
    except:
        return 1
    return 1 if rank < 100000 else 0


# 10. Domain Age
def domainAge(domain_name):
    try:
        creation_date = domain_name.creation_date
        expiration_date = domain_name.expiration_date

        if isinstance(creation_date, list):
            creation_date = creation_date[0]
        if isinstance(expiration_date, list):
            expiration_date = expiration_date[0]

        age = abs((expiration_date - creation_date).days)
        return 1 if (age / 30) < 6 else 0
    except:
        return 1


# 11. Domain End
def domainEnd(domain_name):
    try:
        expiration_date = domain_name.expiration_date
        if isinstance(expiration_date, list):
            expiration_date = expiration_date[0]

        today = datetime.now()
        end = abs((expiration_date - today).days)
        return 1 if (end / 30) >= 6 else 0
    except:
        return 1


# 12. IFrame Redirection
def iframe(response):
    if response == "":
        return 1
    return 0 if re.findall(r"[<iframe>|<frameBorder>]", response.text) else 1


# 13. Mouse Over
def mouseOver(response):
    if response == "":
        return 1
    return 1 if re.findall("<script>.+onmouseover.+</script>", response.text) else 0


# 14. Right Click Disabled
def rightClick(response):
    if response == "":
        return 1
    return 0 if re.findall(r"event.button ?== ?2", response.text) else 1


# 15. Website Forwarding
def forwarding(response):
    if response == "":
        return 1
    return 0 if len(response.history) <= 2 else 1


# 🔥 MAIN FEATURE EXTRACTION FUNCTION
def featureExtraction(url):
    features = []

    features.append(havingIP(url))
    features.append(haveAtSign(url))
    features.append(getLength(url))
    features.append(getDepth(url))
    features.append(redirection(url))
    features.append(httpDomain(url))
    features.append(tinyURL(url))
    features.append(prefixSuffix(url))

    dns = 0
    try:
        domain_name = whois.whois(urlparse(url).netloc)
    except:
        dns = 1

    features.append(dns)
    features.append(web_traffic(url))
    features.append(1 if dns == 1 else domainAge(domain_name))
    features.append(1 if dns == 1 else domainEnd(domain_name))

    try:
        response = requests.get(url, timeout=5)
    except:
        response = ""

    features.append(iframe(response))
    features.append(mouseOver(response))
    features.append(rightClick(response))
    features.append(forwarding(response))

    return features
