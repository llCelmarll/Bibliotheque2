from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.Contact import Contact


class ContactRepository:
    """Repository pour les contacts"""

    def __init__(self, session: Session):
        self.session = session

    def create(self, contact: Contact) -> Contact:
        """Insère un contact dans la base"""
        self.session.add(contact)
        self.session.commit()
        self.session.refresh(contact)
        return contact

    def get_by_id(self, contact_id: int, owner_id: int) -> Optional[Contact]:
        """Retourne un contact en fonction de son ID et owner_id"""
        statement = select(Contact).where(
            Contact.id == contact_id,
            Contact.owner_id == owner_id
        )
        return self.session.exec(statement).first()

    def get_by_name(self, name: str, owner_id: int) -> Optional[Contact]:
        """Retourne un contact en fonction de son nom et owner_id (insensible à la casse)"""
        if not name:
            return None
        statement = select(Contact).where(
            func.lower(Contact.name) == name.lower(),
            Contact.owner_id == owner_id
        )
        return self.session.exec(statement).first()

    def get_all(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[Contact]:
        """Retourne tous les contacts d'un utilisateur avec pagination"""
        statement = (
            select(Contact)
            .where(Contact.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        results = self.session.exec(statement)
        return list(results)

    def update(self, contact: Contact) -> Contact:
        """Met à jour un contact dans la base"""
        self.session.add(contact)
        self.session.commit()
        self.session.refresh(contact)
        return contact

    def delete(self, contact: Contact) -> None:
        """Supprime un contact de la base"""
        self.session.delete(contact)
        self.session.commit()

    def search_fuzzy(self, query: str, owner_id: int, limit: int = 10) -> List[Contact]:
        """Recherche fuzzy de contacts par nom pour un utilisateur"""
        if not query or len(query.strip()) < 2:
            # Si requête trop courte, retourner les premiers résultats
            statement = select(Contact).where(Contact.owner_id == owner_id).limit(limit)
            results = self.session.exec(statement)
            return list(results)

        # Recherche avec LIKE (insensible à la casse)
        search_pattern = f"%{query.strip()}%"
        statement = (
            select(Contact)
            .where(
                func.lower(Contact.name).like(search_pattern.lower()),
                Contact.owner_id == owner_id
            )
            .limit(limit)
        )
        results = self.session.exec(statement)
        return list(results)

    def count_by_owner(self, owner_id: int) -> int:
        """Compte le nombre de contacts pour un utilisateur"""
        statement = select(func.count(Contact.id)).where(Contact.owner_id == owner_id)
        return self.session.exec(statement).one()
