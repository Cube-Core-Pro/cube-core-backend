import sys
import json
import os
import hashlib
import logging
import numpy as np
from scipy.stats import entropy

# Configura logging profesional para producción (salida a stderr)
logging.basicConfig(level=logging.INFO, stream=sys.stderr, format='%(asctime)s - %(levelname)s - %(message)s')

# Blacklist de hashes reales de malware conocidos (MD5 y SHA256)
# Fuentes: VirusShare, MalwareBazaar, VirusTotal, CIS, AlienVault, etc. (actualizar periódicamente con feeds automáticos)
KNOWN_BAD_MD5 = {
    'f0f322dcfe9953991c03746984b923ed': 'DDoS Malware',
    '1fa3fc9ac5eb03d95bfa401a26111447': 'Remcos RAT',
    'f3109e3234a83452de39ad40a285a5fd': 'Remcos RAT Variant',
    '6a8401448a5bd2b540850f811b20a66d': 'Dridex',
    '7d1f2798bd70c6cf04f5ad4de1aa68d2': 'Formbook',
    'f2752c991000ad9d807fcbe188f03695': 'Formbook Variant',
    '44d88612fea8a8f36de82e1278abb02f': 'EICAR Test (Production Placeholder)',
    '6690cbf0c23303701f41bc3972ae9829': 'Unknown Malware Sample',
}

KNOWN_BAD_SHA256 = {
    '9001567e2025f83c936b8746fd3b01e44572f70d8ddec39b75b9459f7e5089c8': 'Unknown Malware',
    '178ba564b39bd07577e974a9b677dfd86ffa1f1d0299dfd958eb883c5ef6c3e1': 'Dridex',
    '8571a354b5cdd9ec3735b84fa207e72c7aea1ab82ea2e4ffea1373335b3e88f4': 'IISShellModule',
    'ef537f25c895bfa782526529a9b63d97aa631564d5d789c2b765448c8635fb6c': 'Agent Tesla',
    '795db7bdad1befdd3ad942be79715f6b0c5083d859901b81657b590c9628790f': 'Ryuk Ransomware',
    '3c5afa0fe75dcb4b1d86bbf19c75d64ae1ec00a6ed2bd6b34e88af8c23df9bfa': 'Unknown Malware Sample',
    'fb55414848281f804858ce188c3dc659d129e283bd62d58d34f6e6f568feab37': 'Suspicious File',
}

# Umbral de entropía para detectar archivos encriptados/comprimidos sospechosos (malware ofuscado)
ENTROPY_THRESHOLD = 7.9  # Alto entropía indica posible ransomware o packer

# Firmas de cabeceras ejecutables peligrosas
EXECUTABLE_HEADERS = {
    b'\x4D\x5A': 'Windows PE (MZ)',
    b'\x7FELF': 'Linux ELF',
    b'\xFE\xED\xFA\xCE': 'Mach-O (macOS)',
    b'\xFE\xED\xFA\xCF': 'Mach-O (macOS 64-bit)',
    b'%PDF-': 'PDF (check for embedded JS)',
}

def is_infected(file_path: str) -> dict:
    result = {
        "infected": False,
        "reason": None,
        "filename": os.path.basename(file_path),
        "size": 0,
        "hashes": {"md5": None, "sha256": None},
        "entropy": 0.0,
    }

    try:
        if not os.path.isfile(file_path):
            result["reason"] = "File does not exist"
            logging.error(result["reason"] + f": {file_path}")
            return result

        file_size = os.path.getsize(file_path)
        if file_size == 0:
            result["reason"] = "File is empty"
            logging.warning(result["reason"] + f": {file_path}")
            return result
        result["size"] = file_size

        # Leer en chunks para manejar archivos grandes eficientemente
        md5_hash = hashlib.md5()
        sha256_hash = hashlib.sha256()
        byte_counts = np.zeros(256, dtype=int)
        header_checked = False
        pdf_checked = False
        suspicious_content = False
        shellcode_detected = False

        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                md5_hash.update(chunk)
                sha256_hash.update(chunk)

                # Contar bytes para entropía
                for byte in chunk:
                    byte_counts[byte] += 1

                # Check cabecera en primer chunk
                if not header_checked:
                    for sig, desc in EXECUTABLE_HEADERS.items():
                        if chunk.startswith(sig):
                            if sig == b'%PDF-':
                                pdf_checked = True
                            else:
                                logging.critical(f"Executable header detected: {desc} in {file_path}")
                                result["infected"] = True
                                result["reason"] = f"Suspicious executable header: {desc}"
                                return result
                    header_checked = True

                # Check para JS embebido en PDF (simple string search)
                if pdf_checked and b'/JavaScript' in chunk:
                    logging.critical(f"Embedded JavaScript detected in PDF: {file_path}")
                    result["infected"] = True
                    result["reason"] = "Embedded JavaScript in PDF (potential exploit)"
                    return result

                # Check heurístico único: strings sospechosos (e.g., ransomware notes o comandos maliciosos)
                suspicious_strings = [b'bitcoin', b'ransom', b'encrypt', b'decrypt', b'cmd.exe /c', b'powershell.exe']
                if any(s in chunk.lower() for s in suspicious_strings):
                    suspicious_content = True

                # Heurístico único adicional: detectar posibles shellcode (e.g., secuencias NOP repetidas en exploits)
                if b'\x90' * 20 in chunk:  # NOP sled común en buffer overflows
                    shellcode_detected = True

        result["hashes"]["md5"] = md5_hash.hexdigest()
        result["hashes"]["sha256"] = sha256_hash.hexdigest()

        # Check blacklist de hashes
        if result["hashes"]["md5"] in KNOWN_BAD_MD5:
            reason = KNOWN_BAD_MD5[result["hashes"]["md5"]]
            logging.critical(f"MD5 blacklist match: {reason} in {file_path}")
            result["infected"] = True
            result["reason"] = f"Known malware (MD5): {reason}"
            return result

        if result["hashes"]["sha256"] in KNOWN_BAD_SHA256:
            reason = KNOWN_BAD_SHA256[result["hashes"]["sha256"]]
            logging.critical(f"SHA256 blacklist match: {reason} in {file_path}")
            result["infected"] = True
            result["reason"] = f"Known malware (SHA256): {reason}"
            return result

        # Cálculo de entropía (heurístico para detectar ofuscación)
        probs = byte_counts / byte_counts.sum()
        file_entropy = entropy(probs)
        result["entropy"] = file_entropy
        if file_entropy > ENTROPY_THRESHOLD:
            logging.warning(f"High entropy detected (possible encrypted malware): {file_entropy} in {file_path}")
            result["infected"] = True
            result["reason"] = f"High file entropy: {file_entropy} (suspected packed/encrypted malware)"
            return result

        # Additional heuristic check for suspicious content
        if suspicious_content:
            logging.warning(f"Suspicious strings detected in {file_path}")
            result["infected"] = True
            result["reason"] = "Suspicious content strings (potential ransomware or command injection)"
            return result

        if shellcode_detected:
            logging.warning(f"Potential shellcode detected (NOP sled) in {file_path}")
            result["infected"] = True
            result["reason"] = "Potential shellcode pattern (NOP sled detected)"
            return result

        result["reason"] = "Scan completed: No threats detected"
        return result

    except Exception as e:
        logging.error(f"Unexpected error scanning {file_path}: {str(e)}")
        result["reason"] = f"Scan error: {str(e)}"
        return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"infected": False, "reason": "No file path provided"}))
        sys.exit(1)
    file_path = sys.argv[1]
    scan_result = is_infected(file_path)
    print(json.dumps(scan_result, ensure_ascii=False))